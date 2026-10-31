import { Hono } from 'hono';

import { requireAdmin } from '../../shared/auth/index.js';
import type { SupabaseClientFactory } from '../../shared/supabase/supabase-client-factory.js';
import type { AppHonoEnv } from '../../shared/types.js';
import type { createCategoriesController } from './categories.controller.js';

type CategoriesController = ReturnType<typeof createCategoriesController>;

export function createCategoriesRoutes(
  clients: SupabaseClientFactory,
  controller: CategoriesController,
) {
  return new Hono<AppHonoEnv>()
    .use('*', requireAdmin(clients))
    .get('/', controller.list)
    .post('/', controller.create)
    .put('/:id', controller.update)
    .put('/:id/active', controller.setActive)
    .post('/:id/order', controller.move)
    .delete('/:id', controller.delete);
}
