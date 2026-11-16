import { createImageController } from '../media/image/image.controller';
import { SupabaseImageRepository } from '../media/image/image.repository';
import { createImageService } from '../media/image/image.module';
import { createVideoController } from '../media/video/video.controller';
import { createVideoService } from '../media/video/video.module';
import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory';
import { createProductsController } from './products.controller';
import { SupabaseProductsRepository } from './products.repository';
import { createProductsRoutes } from './products.routes';
import { ProductsService } from './products.service';

const createProductsService = (client: AppSupabaseClient) =>
  new ProductsService(new SupabaseProductsRepository(client, new SupabaseImageRepository(client)));

export function createProductsModule(clients: SupabaseClientFactory) {
  return createProductsRoutes(
    clients,
    createProductsController(createProductsService),
    createImageController('product', createImageService),
    createVideoController(createVideoService),
  );
}
