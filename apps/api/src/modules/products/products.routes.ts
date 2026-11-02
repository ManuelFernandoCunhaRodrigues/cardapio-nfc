import { Hono } from 'hono';

import { requireAdmin } from '../../shared/auth/index.js';
import type { SupabaseClientFactory } from '../../shared/supabase/supabase-client-factory.js';
import type { AppHonoEnv } from '../../shared/types.js';
import { imageBodyLimit } from '../media/image/image-body-limit.js';
import type { createImageController } from '../media/image/image.controller.js';
import type { createProductsController } from './products.controller.js';

type ProductsController = ReturnType<typeof createProductsController>;
type ImageController = ReturnType<typeof createImageController>;

export function createProductsRoutes(
  clients: SupabaseClientFactory,
  controller: ProductsController,
  imageController: ImageController,
) {
  return new Hono<AppHonoEnv>()
    .use('*', requireAdmin(clients))
    .get('/', controller.list)
    .post('/', controller.create)
    .put('/:id', controller.update)
    .put('/:id/situation', controller.setSituation)
    .post('/:id/order', controller.move)
    .post('/:id/image', imageBodyLimit, imageController.upload)
    .delete('/:id/image', imageController.remove)
    .delete('/:id', controller.delete);
}
