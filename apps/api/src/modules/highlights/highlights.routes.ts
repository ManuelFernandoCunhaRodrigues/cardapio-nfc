import { Hono } from 'hono';

import { requireAdmin } from '../../shared/auth/index';
import type { SupabaseClientFactory } from '../../shared/supabase/supabase-client-factory';
import type { AppHonoEnv } from '../../shared/types';
import type { createHighlightsController } from './highlights.controller';
import { imageBodyLimit } from '../media/image/image-body-limit';
import type { createImageController } from '../media/image/image.controller';

type HighlightsController = ReturnType<typeof createHighlightsController>;
type ImageController = ReturnType<typeof createImageController>;

export function createHighlightsRoutes(
  clients: SupabaseClientFactory,
  controller: HighlightsController,
  imageController: ImageController,
) {
  return new Hono<AppHonoEnv>()
    .use('*', requireAdmin(clients))
    .get('/', controller.list)
    .post('/', controller.create)
    .put('/:id', controller.update)
    .put('/:id/active', controller.setActive)
    .post('/:id/order', controller.move)
    .post('/:id/image', imageBodyLimit, imageController.upload)
    .delete('/:id/image', imageController.remove)
    .delete('/:id', controller.delete);
}
