import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'async_hooks';

// Request-scoped storage for Tenant Context
export interface TenantContext {
  tenantId?: string;
  userId?: string;
}

export const tenantLocalStorage = new AsyncLocalStorage<TenantContext>();

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Prisma Client extended to intercept all operations and inject postgres session tenant variable
export const prisma = basePrisma.$extends({
  query: {
    async $allOperations({ operation, args, query }) {
      const context = tenantLocalStorage.getStore();
      const tenantId = context?.tenantId;
      
      console.log(`🔍 [PRISMA QUERY] Operation: ${operation}, tenantId: ${tenantId}`);

      // If no tenant context is present (e.g. system jobs, registration routes), run query standardly
      if (!tenantId) {
        return query(args);
      }

      // Run connection-level configuration and query in a transaction to guarantee consistency
      const [_, result] = await basePrisma.$transaction([
        basePrisma.$executeRawUnsafe(`SET LOCAL app.current_tenant = '${tenantId}'`),
        query(args),
      ]);

      return result;
    },
  },
});

export type ExtendedPrismaClient = typeof prisma;
export * from '@prisma/client';
