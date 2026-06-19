import { prisma, tenantLocalStorage } from '../packages/database';

async function run() {
  const sorriso = await prisma.tenant.findUnique({ where: { slug: 'clinica-sorriso' } });
  if (!sorriso) {
    console.log('No tenant found, run seed first.');
    return;
  }

  const tenantId = sorriso.id;
  console.log('Setting tenantId:', tenantId);

  await tenantLocalStorage.run({ tenantId }, async () => {
    console.log('Inside ALS store:', tenantLocalStorage.getStore());
    const user = await prisma.user.findFirst({ where: { tenantId } });
    console.log('Found user:', user);
  });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
