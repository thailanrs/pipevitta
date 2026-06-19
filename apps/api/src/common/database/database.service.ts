import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma, ExtendedPrismaClient } from '@pipevitta/database';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  // Expose the RLS-extended Prisma Client
  public readonly client: ExtendedPrismaClient = prisma;

  async onModuleInit(): Promise<void> {
    // Force connection to local database during startup
    await (this.client as any).$connect();
  }

  async onModuleDestroy(): Promise<void> {
    // Ensure clean connection teardown
    await (this.client as any).$disconnect();
  }
}
