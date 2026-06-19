import { PrismaClient, Plan, UserProfile, AppointmentStatus, TransactionType, TransactionStatus } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars from root .env before initializing Prisma
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
if (process.env.MIGRATION_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;
}

const prisma = new PrismaClient();

// Helper to hash passwords using SHA-256 (simple and standard for seed script)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean existing data
  await prisma.transaction.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('🧹 Database cleaned.');

  // 2. Create Tenants
  const tenantSorriso = await prisma.tenant.create({
    data: {
      name: 'Clínica Sorriso',
      slug: 'clinica-sorriso',
      plan: Plan.STANDARD,
    },
  });

  const tenantBella = await prisma.tenant.create({
    data: {
      name: 'Clínica Estética Bella',
      slug: 'clinica-bella',
      plan: Plan.PREMIUM,
    },
  });

  console.log(`🏢 Created tenants: ${tenantSorriso.name} (${tenantSorriso.id}), ${tenantBella.name} (${tenantBella.id})`);

  // 3. Create Users (Sorriso)
  const passwordHash = hashPassword('pipevitta123'); // Default password for all seed users

  const adminSorriso = await prisma.user.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Dra. Ana Admin',
      email: 'admin@sorriso.com.br',
      passwordHash,
      profiles: [UserProfile.ADMIN],
    },
  });

  const dentistSorriso = await prisma.user.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Dr. Carlos Dentista',
      email: 'carlos@sorriso.com.br',
      passwordHash,
      profiles: [UserProfile.PROFISSIONAL],
    },
  });

  const recepcionistSorriso = await prisma.user.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Juliana Recepção',
      email: 'juliana@sorriso.com.br',
      passwordHash,
      profiles: [UserProfile.RECEPCIONISTA],
    },
  });

  // Create Users (Bella)
  const adminBella = await prisma.user.create({
    data: {
      tenantId: tenantBella.id,
      name: 'Dra. Aline Bella',
      email: 'aline@bella.com.br',
      passwordHash,
      profiles: [UserProfile.ADMIN, UserProfile.PROFISSIONAL],
    },
  });

  console.log('👥 Created seed users for both tenants.');

  // 4. Create Patients (Sorriso)
  const patientMariana = await prisma.patient.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Mariana Costa',
      cpf: '12345678901',
      email: 'mariana.costa@gmail.com',
      phone: '+5511999999999',
      birthDate: new Date('1995-04-12'),
      notes: 'Interessada em Harmonização Facial e Clareamento.',
      clinicalHistory: 'Histórico de sensibilidade nos dentes inferiores.',
    },
  });

  const patientRoberto = await prisma.patient.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Roberto Silva',
      cpf: '98765432100',
      email: 'roberto.silva@hotmail.com',
      phone: '+5511888888888',
      birthDate: new Date('1982-10-23'),
      notes: 'Agendou canal de emergência.',
    },
  });

  // Create Patients (Bella)
  const patientAnaBella = await prisma.patient.create({
    data: {
      tenantId: tenantBella.id,
      name: 'Ana Carolina Lima',
      cpf: '45678901234',
      email: 'ana.lima@gmail.com',
      phone: '+5511777777777',
      birthDate: new Date('1990-08-15'),
    },
  });

  console.log('👤 Created patients.');

  // 5. Create Appointments (Sorriso)
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
  const endToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);

  const startTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0, 0);
  const endTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 15, 30, 0);

  await prisma.appointment.create({
    data: {
      tenantId: tenantSorriso.id,
      patientId: patientMariana.id,
      professionalId: dentistSorriso.id,
      startTime: startToday,
      endTime: endToday,
      status: AppointmentStatus.CONFIRMED,
      room: 'Sala 1',
      bufferMinutes: 15,
      notes: 'Primeira consulta de avaliação estética.',
    },
  });

  await prisma.appointment.create({
    data: {
      tenantId: tenantSorriso.id,
      patientId: patientRoberto.id,
      professionalId: dentistSorriso.id,
      startTime: startTomorrow,
      endTime: endTomorrow,
      status: AppointmentStatus.PENDING,
      room: 'Sala 2',
      notes: 'Tratamento de canal.',
    },
  });

  // Create Appointments (Bella)
  await prisma.appointment.create({
    data: {
      tenantId: tenantBella.id,
      patientId: patientAnaBella.id,
      professionalId: adminBella.id,
      startTime: startToday,
      endTime: endToday,
      status: AppointmentStatus.CONFIRMED,
      room: 'Procedimentos 1',
      notes: 'Sessão de peeling químico.',
    },
  });

  console.log('📅 Created appointments.');

  // 6. Create Transactions (Sorriso)
  await prisma.transaction.create({
    data: {
      tenantId: tenantSorriso.id,
      patientId: patientMariana.id,
      amount: 150.00,
      type: TransactionType.INFLOW,
      status: TransactionStatus.COMPLETED,
      description: 'Consulta de Avaliação de Estética',
      createdById: recepcionistSorriso.id,
      commissionAmount: 45.00, // 30% split commission
      professionalId: dentistSorriso.id,
    },
  });

  await prisma.transaction.create({
    data: {
      tenantId: tenantSorriso.id,
      amount: 80.00,
      type: TransactionType.OUTFLOW,
      status: TransactionStatus.COMPLETED,
      description: 'Materiais de limpeza para escritório',
      createdById: adminSorriso.id,
    },
  });

  console.log('💰 Created transactions (financial records).');
  console.log('✅ Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
