import { Hono } from 'hono';

import { requireAdmin } from '../../shared/auth/index.js';
import type { SupabaseClientFactory } from '../../shared/supabase/supabase-client-factory.js';
import type { AppHonoEnv } from '../../shared/types.js';
import type {
  createAdminStoreController,
  createPublicStoreController,
} from './store.controller.js';

type StoreControllers = {
  publicController: ReturnType<typeof createPublicStoreController>;
  adminController: ReturnType<typeof createAdminStoreController>;
};

export function createPublicStoreRoutes(controller: StoreControllers['publicController']) {
  return new Hono<AppHonoEnv>().get('/', controller.getSettings);
}

export function createAdminStoreRoutes(
  clients: SupabaseClientFactory,
  controller: StoreControllers['adminController'],
) {
  return new Hono<AppHonoEnv>()
    .use('*', requireAdmin(clients))
    .get('/', controller.getSettings)
    .put('/', controller.updateSettings)
    .put('/status', controller.updateStatusOverride);
}
