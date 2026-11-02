import { Hono } from 'hono';

import { requireAdmin } from '../../shared/auth/index.js';
import type { SupabaseClientFactory } from '../../shared/supabase/supabase-client-factory.js';
import type { AppHonoEnv } from '../../shared/types.js';
import type { createSessionController } from './session.controller.js';

type SessionController = ReturnType<typeof createSessionController>;

export function createSessionRoutes(clients: SupabaseClientFactory, controller: SessionController) {
  return new Hono<AppHonoEnv>().get('/', requireAdmin(clients), controller);
}
