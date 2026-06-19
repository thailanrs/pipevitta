import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { DatabaseService } from '../src/common/database/database.service';
import { TransactionType, TransactionStatus, tenantLocalStorage } from '@pipevitta/database';
import * as crypto from 'crypto';

describe('PipeVitta API End-to-End Tests', () => {
  let app: INestApplication;
  let db: DatabaseService;
  let sorrisoToken: string;
  let bellaToken: string;
  let sorrisoTenantId: string;
  let bellaTenantId: string;
  let carlosUserId: string;

  // Generate the password hash dynamically to match seed encryption
  const passwordHash = crypto.createHash('sha256').update('pipevitta123').digest('hex');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    db = app.get(DatabaseService);

    // Fetch tenant and user details populated by the seed script
    const sorriso = await db.client.tenant.findUnique({ where: { slug: 'clinica-sorriso' } });
    const bella = await db.client.tenant.findUnique({ where: { slug: 'clinica-bella' } });
    
    if (!sorriso || !bella) {
      throw new Error('Seed data not found. Please run npm run db:seed first.');
    }
    
    sorrisoTenantId = sorriso.id;
    bellaTenantId = bella.id;

    // Use transaction-based tenant binding to bypass Jest's AsyncLocalStorage issues in test lifecycle
    const carlos = await db.client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${sorrisoTenantId}'`);
      return tx.user.findFirst({ where: { tenantId: sorrisoTenantId, email: 'carlos@sorriso.com.br' } });
    });
    if (!carlos) {
      throw new Error('Seed professional user not found.');
    }
    carlosUserId = carlos.id;

    // Login as Sorriso Admin to fetch JWT
    const sorrisoLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        tenantSlug: 'clinica-sorriso',
        email: 'admin@sorriso.com.br',
        passwordHash,
      })
      .expect(200);
    sorrisoToken = sorrisoLoginRes.body.accessToken;

    // Login as Bella Admin to fetch JWT
    const bellaLoginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        tenantSlug: 'clinica-bella',
        email: 'aline@bella.com.br',
        passwordHash,
      })
      .expect(200);
    bellaToken = bellaLoginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication and Scope Validation', () => {
    it('should reject requests without a token', async () => {
      await request(app.getHttpServer())
        .get('/patients')
        .expect(401);
    });

    it('should reject requests with an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', 'Bearer invalid_token_value')
        .expect(401);
    });
  });

  describe('2. Multi-Tenancy & PostgreSQL Row Level Security (RLS)', () => {
    it('should return only patients belonging to the logged-in tenant', async () => {
      // Fetch patients as Sorriso Admin
      const sorrisoRes = await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${sorrisoToken}`)
        .expect(200);

      expect(sorrisoRes.body.length).toBeGreaterThan(0);
      sorrisoRes.body.forEach((patient: any) => {
        expect(patient.tenantId).toBe(sorrisoTenantId);
      });

      // Fetch patients as Bella Admin
      const bellaRes = await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${bellaToken}`)
        .expect(200);

      expect(bellaRes.body.length).toBeGreaterThan(0);
      bellaRes.body.forEach((patient: any) => {
        expect(patient.tenantId).toBe(bellaTenantId);
      });
    });

    it('should prevent cross-tenant details view (returns 404 under RLS)', async () => {
      // Find a patient belonging to Bella Estética
      const bellaPatients = await db.client.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${bellaTenantId}'`);
        return tx.patient.findMany({ where: { tenantId: bellaTenantId } });
      });
      const targetBellaPatientId = bellaPatients[0].id;

      // Sorriso Admin tries to view Bella patient by ID
      await request(app.getHttpServer())
        .get(`/patients/${targetBellaPatientId}`)
        .set('Authorization', `Bearer ${sorrisoToken}`)
        .expect(404); // Database RLS hides the patient, resulting in a NotFoundException
    });
  });

  describe('3. Financial & Professional Commission Split', () => {
    it('should calculate professional commission repasses correctly', async () => {
      // Get list of Sorriso patients
      const patientRes = await request(app.getHttpServer())
        .get('/patients')
        .set('Authorization', `Bearer ${sorrisoToken}`)
        .expect(200);
      const patientId = patientRes.body[0].id;

      // Create a new completed treatment posting with a R$50.00 split commission for Carlos
      await request(app.getHttpServer())
        .post('/financial')
        .set('Authorization', `Bearer ${sorrisoToken}`)
        .send({
          patientId,
          amount: 200.00,
          type: TransactionType.INFLOW,
          status: TransactionStatus.COMPLETED,
          description: 'Restauração Dente 46',
          commissionAmount: 50.00,
          professionalId: carlosUserId,
        })
        .expect(201);

      // Query the commissions summary endpoint
      const commissionsRes = await request(app.getHttpServer())
        .get('/financial/commissions')
        .set('Authorization', `Bearer ${sorrisoToken}`)
        .expect(200);

      // Initial seed commission for Carlos was R$45.00. Plus our new R$50.00 posting equals R$95.00.
      const carlosComm = commissionsRes.body.find((c: any) => c.id === carlosUserId);
      expect(carlosComm).toBeDefined();
      expect(carlosComm.totalCommission).toBe(95.00);
    });
  });
});
