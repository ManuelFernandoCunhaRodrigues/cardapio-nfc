import { Hono } from 'hono';

import { requireAdmin } from '../../shared/auth/index';
import type { SupabaseClientFactory } from '../../shared/supabase/supabase-client-factory';
import type { AppHonoEnv } from '../../shared/types';
import type { createSessionController } from './session.controller';

type SessionController = ReturnType<typeof createSessionController>;

export function createSessionRoutes(clients: SupabaseClientFactory, controller: SessionController) {
  return new Hono<AppHonoEnv>().get('/', requireAdmin(clients), controller);
}
