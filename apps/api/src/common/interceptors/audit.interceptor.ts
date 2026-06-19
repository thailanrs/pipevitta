import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { DatabaseService } from '../database/database.service';
import { tenantLocalStorage } from '@pipevitta/database';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly db: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Filter to only intercept mutating HTTP requests (state modifications)
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!isMutation) {
      return next.handle();
    }

    const tenantStore = tenantLocalStorage.getStore();
    const tenantId = tenantStore?.tenantId;
    const userId = tenantStore?.userId;

    // If no tenant scope is established (e.g. during authentication), skip logging
    if (!tenantId) {
      return next.handle();
    }

    const ipAddress = request.ip || request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];
    const resource = context.getClass().name.replace('Controller', '');
    const resourceId =
      typeof request.params.id === 'string' ? request.params.id : null;

    let action = 'CREATE';
    if (method === 'PUT' || method === 'PATCH') {
      action = 'UPDATE';
    } else if (method === 'DELETE') {
      action = 'DELETE';
    }

    // Capture input body for before_state evaluation (simplified reference for MVP)
    const beforeState = method !== 'POST' ? request.body : null;

    return next.handle().pipe(
      tap((response) => {
        void (async () => {
          try {
            const afterState = method !== 'DELETE' ? response : null;

            // Write audit log entry asynchronously in the background
            await this.db.client.auditLog.create({
              data: {
                tenantId,
                userId,
                ipAddress,
                userAgent,
                action,
                resource,
                resourceId,
                beforeState: beforeState
                  ? JSON.parse(JSON.stringify(beforeState))
                  : undefined,
                afterState: afterState
                  ? JSON.parse(JSON.stringify(afterState))
                  : undefined,
              },
            });
          } catch (error) {
            console.error('Error recording audit trail:', error);
          }
        })();
      }),
    );
  }
}
