import { createParamDecorator } from '@nestjs/common';
import { tenantLocalStorage } from '@pipevitta/database';

export const CurrentTenant = createParamDecorator((): string | undefined => {
  const store = tenantLocalStorage.getStore();
  return store?.tenantId;
});
