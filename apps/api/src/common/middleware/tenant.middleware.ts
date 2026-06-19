import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantLocalStorage } from '@pipevitta/database';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // Extract tenantId from custom header for request scoping
    const tenantHeader =
      req.headers['x-tenant-id'] || req.headers['X-Tenant-Id'];
    const tenantId = Array.isArray(tenantHeader)
      ? tenantHeader[0]
      : tenantHeader;

    // Run the rest of the NestJS execution chain inside the AsyncLocalStorage wrapper
    tenantLocalStorage.run({ tenantId }, () => {
      next();
    });
  }
}
