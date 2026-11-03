import { Hono } from 'hono';

import type { ApiEnv } from './config/env';
import { createHealthModule } from './modules/health/health.module';
import { createCategoriesModule } from './modules/categories/categories.module';
import { createHighlightsModule } from './modules/highlights/highlights.module';
import { createMenuModule } from './modules/menu/menu.module';
import { createSessionModule } from './modules/session/session.module';
import { createProductsModule } from './modules/products/products.module';
import { createAdminStoreModule, createPublicStoreModule } from './modules/store/store.module';
import {
  corsMiddleware,
  errorHandler,
  requestIdMiddleware,
  requestTimeoutMiddleware,
} from './shared/http/index';
import type { SupabaseClientFactory } from './shared/supabase/supabase-client-factory';
import type { AppHonoEnv } from './shared/types';

type AppDependencies = {
  env: ApiEnv;
  supabase: SupabaseClientFactory;
};

export function createApp({ env, supabase }: AppDependencies) {
  const app = new Hono<AppHonoEnv>();
  const publicClient = supabase.createPublicClient();
  app.use('*', requestIdMiddleware());
  app.use('*', corsMiddleware(env.WEB_ORIGIN));
  app.use('*', requestTimeoutMiddleware());
  app.onError(errorHandler);
  app.notFound((context) =>
    context.json({ status: 'error' as const, message: 'Recurso não encontrado.' }, 404),
  );

  app.route('/health', createHealthModule(publicClient));
  app.route('/v1', createMenuModule(publicClient));
  app.route('/v1/store', createPublicStoreModule(publicClient));
  app.route('/v1/admin/session', createSessionModule(supabase));
  app.route('/v1/admin/store', createAdminStoreModule(supabase));
  app.route('/v1/admin/categories', createCategoriesModule(supabase));
  app.route('/v1/admin/highlights', createHighlightsModule(supabase));
  app.route('/v1/admin/products', createProductsModule(supabase));
  return app;
}
