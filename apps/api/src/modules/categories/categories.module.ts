import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory';
import { createCategoriesController } from './categories.controller';
import { SupabaseCategoriesRepository } from './categories.repository';
import { createCategoriesRoutes } from './categories.routes';
import { CategoriesService } from './categories.service';

function createCategoriesService(client: AppSupabaseClient) {
  return new CategoriesService(new SupabaseCategoriesRepository(client));
}

export function createCategoriesModule(clients: SupabaseClientFactory) {
  return createCategoriesRoutes(clients, createCategoriesController(createCategoriesService));
}
