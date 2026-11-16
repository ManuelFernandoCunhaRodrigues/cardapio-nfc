import { Hono } from 'hono';

import { requireAdmin } from '../../shared/auth/index';
import type { SupabaseClientFactory } from '../../shared/supabase/supabase-client-factory';
import type { AppHonoEnv } from '../../shared/types';
import { imageBodyLimit } from '../media/image/image-body-limit';
import type { createImageController } from '../media/image/image.controller';
import type { createVideoController } from '../media/video/video.controller';
import type { createProductsController } from './products.controller';

type ProductsController = ReturnType<typeof createProductsController>;
type ImageController = ReturnType<typeof createImageController>;
type VideoController = ReturnType<typeof createVideoController>;

export function createProductsRoutes(
  clients: SupabaseClientFactory,
  controller: ProductsController,
  imageController: ImageController,
  videoController: VideoController,
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
    .post('/:id/video/upload', videoController.prepareUpload)
    .post('/:id/video', videoController.process)
    .delete('/:id/video', videoController.remove)
    .delete('/:id', controller.delete);
}
