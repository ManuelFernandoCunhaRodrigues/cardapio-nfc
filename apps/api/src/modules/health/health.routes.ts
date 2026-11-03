import { Hono } from 'hono';

import type { AppHonoEnv } from '../../shared/types';
import type { createHealthController } from './health.controller';

type HealthController = ReturnType<typeof createHealthController>;

export function createHealthRoutes(controller: HealthController) {
  return new Hono<AppHonoEnv>().get('/', controller);
}
