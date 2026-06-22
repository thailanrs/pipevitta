import { PrismaClient, Plan, UserProfile, AppointmentStatus, TransactionStatus, LeadStatus, AccountType } from '@prisma/client';
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
  await prisma.ledgerEntry.deleteMany();
  await prisma.ledgerAccount.deleteMany();
  await prisma.appointmentResource.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('🧹 Database cleaned.');

  // 2. Create Tenants
  const tenantSorriso = await prisma.tenant.create({
    data: {
      id: 'ffd10431-56be-4493-a34e-6bb5d782ea23',
      name: 'Clínica Sorriso',
      slug: 'clinica-sorriso',
      plan: Plan.STANDARD,
    },
  });

  const tenantBella = await prisma.tenant.create({
    data: {
      id: '6de0c61e-339f-4dec-81ca-30257a56a857',
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

  // 5. Create Resources (Sorriso)
  const resSala1Sorriso = await prisma.resource.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Sala 1 - Cirurgia',
      type: 'ROOM',
    },
  });

  const resSala2Sorriso = await prisma.resource.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Sala 2 - Estética',
      type: 'ROOM',
    },
  });

  await prisma.resource.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Raio-X',
      type: 'EQUIPMENT',
    },
  });

  // Create Resources (Bella)
  const resSala1Bella = await prisma.resource.create({
    data: {
      tenantId: tenantBella.id,
      name: 'Sala Estética 1',
      type: 'ROOM',
    },
  });

  await prisma.resource.create({
    data: {
      tenantId: tenantBella.id,
      name: 'Sala Estética 2',
      type: 'ROOM',
    },
  });

  console.log('🏢 Created resources.');

  // 6. Create Appointments (Sorriso)
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0, 0);
  const endToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0, 0);

  const startTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 14, 0, 0);
  const endTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 15, 30, 0);

  const appointment1 = await prisma.appointment.create({
    data: {
      tenantId: tenantSorriso.id,
      patientId: patientMariana.id,
      professionalId: dentistSorriso.id,
      startTime: startToday,
      endTime: endToday,
      status: AppointmentStatus.CONFIRMED,
      bufferMinutes: 15,
      notes: 'Primeira consulta de avaliação estética.',
    },
  });

  await prisma.appointmentResource.create({
    data: {
      tenantId: tenantSorriso.id,
      appointmentId: appointment1.id,
      resourceId: resSala1Sorriso.id,
    },
  });

  const appointment2 = await prisma.appointment.create({
    data: {
      tenantId: tenantSorriso.id,
      patientId: patientRoberto.id,
      professionalId: dentistSorriso.id,
      startTime: startTomorrow,
      endTime: endTomorrow,
      status: AppointmentStatus.PENDING,
      notes: 'Tratamento de canal.',
    },
  });

  await prisma.appointmentResource.create({
    data: {
      tenantId: tenantSorriso.id,
      appointmentId: appointment2.id,
      resourceId: resSala2Sorriso.id,
    },
  });

  // Create Appointments (Bella)
  const appointment3 = await prisma.appointment.create({
    data: {
      tenantId: tenantBella.id,
      patientId: patientAnaBella.id,
      professionalId: adminBella.id,
      startTime: startToday,
      endTime: endToday,
      status: AppointmentStatus.CONFIRMED,
      notes: 'Sessão de peeling químico.',
    },
  });

  await prisma.appointmentResource.create({
    data: {
      tenantId: tenantBella.id,
      appointmentId: appointment3.id,
      resourceId: resSala1Bella.id,
    },
  });

  console.log('📅 Created appointments.');

  // Create Ledger Accounts (Sorriso)
  const accountCaixaSorriso = await prisma.ledgerAccount.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Caixa Geral',
      type: AccountType.ASSET,
    },
  });

  const accountReceitaSorriso = await prisma.ledgerAccount.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Receita de Serviços',
      type: AccountType.REVENUE,
    },
  });

  const accountDespesaSorriso = await prisma.ledgerAccount.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Despesa de Escritório',
      type: AccountType.EXPENSE,
    },
  });

  const accountDespesaComissaoSorriso = await prisma.ledgerAccount.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Despesa de Comissão',
      type: AccountType.EXPENSE,
    },
  });

  const accountComissaoCarlos = await prisma.ledgerAccount.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Comissão a Pagar - ' + dentistSorriso.id,
      type: AccountType.LIABILITY,
    },
  });

  // Create Ledger Accounts (Bella)
  await prisma.ledgerAccount.create({
    data: {
      tenantId: tenantBella.id,
      name: 'Caixa Geral',
      type: AccountType.ASSET,
    },
  });

  await prisma.ledgerAccount.create({
    data: {
      tenantId: tenantBella.id,
      name: 'Receita de Serviços',
      type: AccountType.REVENUE,
    },
  });

  // 6. Create Transactions (Sorriso)
  const tx1 = await prisma.transaction.create({
    data: {
      tenantId: tenantSorriso.id,
      patientId: patientMariana.id,
      status: TransactionStatus.COMPLETED,
      description: 'Consulta de Avaliação de Estética',
      createdById: recepcionistSorriso.id,
    },
  });

  await prisma.ledgerEntry.createMany({
    data: [
      {
        tenantId: tenantSorriso.id,
        transactionId: tx1.id,
        accountId: accountCaixaSorriso.id,
        debit: 150.00,
        credit: 0.00,
      },
      {
        tenantId: tenantSorriso.id,
        transactionId: tx1.id,
        accountId: accountReceitaSorriso.id,
        debit: 0.00,
        credit: 150.00,
      },
      {
        tenantId: tenantSorriso.id,
        transactionId: tx1.id,
        accountId: accountDespesaComissaoSorriso.id,
        debit: 45.00,
        credit: 0.00,
      },
      {
        tenantId: tenantSorriso.id,
        transactionId: tx1.id,
        accountId: accountComissaoCarlos.id,
        debit: 0.00,
        credit: 45.00,
      },
    ],
  });

  const tx2 = await prisma.transaction.create({
    data: {
      tenantId: tenantSorriso.id,
      status: TransactionStatus.COMPLETED,
      description: 'Materiais de limpeza para escritório',
      createdById: adminSorriso.id,
    },
  });

  await prisma.ledgerEntry.createMany({
    data: [
      {
        tenantId: tenantSorriso.id,
        transactionId: tx2.id,
        accountId: accountDespesaSorriso.id,
        debit: 80.00,
        credit: 0.00,
      },
      {
        tenantId: tenantSorriso.id,
        transactionId: tx2.id,
        accountId: accountCaixaSorriso.id,
        debit: 0.00,
        credit: 80.00,
      },
    ],
  });

  // 7. Create CRM Leads (Sorriso)
  await prisma.lead.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Juliana Mendes',
      procedure: 'Harmonização Full Face',
      estimatedValue: 5200.00,
      status: LeadStatus.NEW,
      source: 'Instagram DM',
      probability: 20,
    },
  });

  await prisma.lead.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Ricardo Alves',
      procedure: 'Toxina Botulínica',
      estimatedValue: 1800.00,
      status: LeadStatus.NEW,
      source: 'Meta Ads',
      probability: 15,
      warningText: 'Contato pendente há 1 dia',
    },
  });

  await prisma.lead.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Fernanda Lima',
      procedure: 'Preenchimento Labial',
      estimatedValue: 2400.00,
      status: LeadStatus.NEGOTIATION,
      source: 'WhatsApp',
      probability: 60,
      professionalId: dentistSorriso.id,
    },
  });

  await prisma.lead.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Carlos Eduardo',
      procedure: 'Fios de PDO',
      estimatedValue: 3800.00,
      status: LeadStatus.SCHEDULED,
      source: 'Indicação',
      probability: 80,
    },
  });

  await prisma.lead.create({
    data: {
      tenantId: tenantSorriso.id,
      name: 'Ana Beatriz',
      procedure: 'Bioestimulador',
      estimatedValue: 4500.00,
      status: LeadStatus.WON,
      source: 'WhatsApp',
      probability: 100,
    },
  });

  // Create CRM Leads (Bella)
  await prisma.lead.create({
    data: {
      tenantId: tenantBella.id,
      name: 'Carla Souza',
      procedure: 'Peeling Químico',
      estimatedValue: 1200.00,
      status: LeadStatus.NEW,
      source: 'Meta Ads',
      probability: 30,
    },
  });

  console.log('💰 Created transactions (financial records).');
  console.log('📈 Created CRM leads.');
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
