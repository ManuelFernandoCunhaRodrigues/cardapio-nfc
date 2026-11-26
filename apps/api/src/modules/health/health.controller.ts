import type { Context } from 'hono';

import { errorResponse } from '../../shared/http';
import type { AppHonoEnv } from '../../shared/types';
import type { HealthService } from './health.service';

export function createHealthController(service: HealthService) {
  return async (context: Context<AppHonoEnv>) => {
    const isHealthy = await service.isHealthy();
    return isHealthy
      ? context.json({ status: 'ok' as const })
      : errorResponse(context, 503, 'Serviço indisponível.');
  };
}
