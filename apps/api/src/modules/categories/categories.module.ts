import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory';
import { compressImageToWebp } from '../media/image/image-compressor';
import { createImageController } from '../media/image/image.controller';
import { SupabaseImageRepository } from '../media/image/image.repository';
import { ImageService } from '../media/image/image.service';
import { createCategoriesController } from './categories.controller';
import { SupabaseCategoriesRepository } from './categories.repository';
import { createCategoriesRoutes } from './categories.routes';
import { CategoriesService } from './categories.service';

function createCategoriesService(client: AppSupabaseClient) {
  return new CategoriesService(
    new SupabaseCategoriesRepository(client, new SupabaseImageRepository(client)),
  );
}

function createImageService(client: AppSupabaseClient) {
  return new ImageService(new SupabaseImageRepository(client), compressImageToWebp);
}

export function createCategoriesModule(clients: SupabaseClientFactory) {
  return createCategoriesRoutes(
    clients,
    createCategoriesController(createCategoriesService),
    createImageController('category', createImageService),
  );
}
