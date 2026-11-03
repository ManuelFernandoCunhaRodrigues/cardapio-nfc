import type { Context } from 'hono';

import type { AppHonoEnv } from '../../shared/types';
import type { HealthService } from './health.service';

export function createHealthController(service: HealthService) {
  return async (context: Context<AppHonoEnv>) => {
    const isHealthy = await service.isHealthy();
    return isHealthy
      ? context.json({ status: 'ok' as const })
      : context.json({ status: 'error' as const, message: 'Serviço indisponível.' }, 503);
  };
}
