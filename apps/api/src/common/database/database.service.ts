import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma, PrismaClient } from '@pipevitta/database';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  // Expose the RLS-extended Prisma Client typed as PrismaClient for full IDE/linter support
  public readonly client: PrismaClient = prisma as unknown as PrismaClient;

  async onModuleInit(): Promise<void> {
    // Force connection to local database during startup
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    // Ensure clean connection teardown
    await this.client.$disconnect();
  }
}
