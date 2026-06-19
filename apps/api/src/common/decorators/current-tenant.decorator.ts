import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { tenantLocalStorage } from '@pipevitta/database';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const store = tenantLocalStorage.getStore();
    return store?.tenantId;
  },
);
