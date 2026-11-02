import { compressImageToWebp } from '../media/image/image-compressor.js';
import { createImageController } from '../media/image/image.controller.js';
import { SupabaseImageRepository } from '../media/image/image.repository.js';
import { ImageService } from '../media/image/image.service.js';
import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory.js';
import { createProductsController } from './products.controller.js';
import { SupabaseProductsRepository } from './products.repository.js';
import { createProductsRoutes } from './products.routes.js';
import { ProductsService } from './products.service.js';

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
