import { Hono } from 'hono';

import type { ApiEnv } from './config/env.js';
import { createHealthModule } from './modules/health/health.module.js';
import { createSessionModule } from './modules/session/session.module.js';
import {
  corsMiddleware,
  errorHandler,
  requestIdMiddleware,
  requestTimeoutMiddleware,
} from './shared/http/index.js';
import type { SupabaseClientFactory } from './shared/supabase/supabase-client-factory.js';
import type { AppHonoEnv } from './shared/types.js';

type AppDependencies = {
  env: ApiEnv;
  supabase: SupabaseClientFactory;
};

export function createApp({ env, supabase }: AppDependencies) {
  const app = new Hono<AppHonoEnv>();
  app.use('*', requestIdMiddleware());
  app.use('*', corsMiddleware(env.WEB_ORIGIN));
  app.use('*', requestTimeoutMiddleware());
  app.onError(errorHandler);
  app.notFound((context) =>
    context.json({ status: 'error' as const, message: 'Recurso não encontrado.' }, 404),
  );

  app.route('/health', createHealthModule(supabase.createPublicClient()));
  app.route('/v1/admin/session', createSessionModule(supabase));
  return app;
}
