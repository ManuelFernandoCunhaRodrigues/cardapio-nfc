import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory';
import { createImageController } from '../media/image/image.controller';
import { SupabaseImageRepository } from '../media/image/image.repository';
import { createImageService } from '../media/image/image.module';
import { createCategoriesController } from './categories.controller';
import { SupabaseCategoriesRepository } from './categories.repository';
import { createCategoriesRoutes } from './categories.routes';
import { CategoriesService } from './categories.service';

function createCategoriesService(client: AppSupabaseClient) {
  return new CategoriesService(
    new SupabaseCategoriesRepository(client, new SupabaseImageRepository(client)),
  );
}

export function createCategoriesModule(clients: SupabaseClientFactory) {
  return createCategoriesRoutes(
    clients,
    createCategoriesController(createCategoriesService),
    createImageController('category', createImageService),
  );
}
