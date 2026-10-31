import { Hono } from 'hono';

import { requireAdmin } from '../../shared/auth/index.js';
import type { SupabaseClientFactory } from '../../shared/supabase/supabase-client-factory.js';
import type { AppHonoEnv } from '../../shared/types.js';
import type { createHighlightsController } from './highlights.controller.js';

type HighlightsController = ReturnType<typeof createHighlightsController>;

export function createHighlightsRoutes(
  clients: SupabaseClientFactory,
  controller: HighlightsController,
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
