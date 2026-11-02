import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory.js';
import { createAdminStoreController, createPublicStoreController } from './store.controller.js';
import { SupabaseStoreRepository } from './store.repository.js';
import { createAdminStoreRoutes, createPublicStoreRoutes } from './store.routes.js';
import { StoreService } from './store.service.js';

function createStoreService(client: AppSupabaseClient) {
  return new StoreService(new SupabaseStoreRepository(client));
}

export function createPublicStoreModule(publicClient: AppSupabaseClient) {
  return createPublicStoreRoutes(createPublicStoreController(createStoreService(publicClient)));
}

export function createAdminStoreModule(clients: SupabaseClientFactory) {
  return createAdminStoreRoutes(clients, createAdminStoreController(createStoreService));
}
