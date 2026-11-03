import { compressImageToWebp } from '../media/image/image-compressor';
import { createImageController } from '../media/image/image.controller';
import { SupabaseImageRepository } from '../media/image/image.repository';
import { ImageService } from '../media/image/image.service';
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
const createImageService = (client: AppSupabaseClient) =>
  new ImageService(new SupabaseImageRepository(client), compressImageToWebp);

export function createProductsModule(clients: SupabaseClientFactory) {
  return createProductsRoutes(
    clients,
    createProductsController(createProductsService),
    createImageController('product', createImageService),
  );
}
