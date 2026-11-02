import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory.js';
import { createCategoriesController } from './categories.controller.js';
import { SupabaseCategoriesRepository } from './categories.repository.js';
import { createCategoriesRoutes } from './categories.routes.js';
import { CategoriesService } from './categories.service.js';

function createCategoriesService(client: AppSupabaseClient) {
  return new CategoriesService(new SupabaseCategoriesRepository(client));
}

export function createCategoriesModule(clients: SupabaseClientFactory) {
  return createCategoriesRoutes(clients, createCategoriesController(createCategoriesService));
}
