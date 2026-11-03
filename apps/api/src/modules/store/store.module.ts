import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory';
import { createAdminStoreController, createPublicStoreController } from './store.controller';
import { SupabaseStoreRepository } from './store.repository';
import { createAdminStoreRoutes, createPublicStoreRoutes } from './store.routes';
import { StoreService } from './store.service';

function createStoreService(client: AppSupabaseClient) {
  return new StoreService(new SupabaseStoreRepository(client));
}

export function createPublicStoreModule(publicClient: AppSupabaseClient) {
  return createPublicStoreRoutes(createPublicStoreController(createStoreService(publicClient)));
}

export function createAdminStoreModule(clients: SupabaseClientFactory) {
  return createAdminStoreRoutes(clients, createAdminStoreController(createStoreService));
}
