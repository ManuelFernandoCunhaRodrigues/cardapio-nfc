import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory.js';
import { createStoreController } from './store.controller.js';
import { SupabaseStoreRepository } from './store.repository.js';
import { createStoreRoutes } from './store.routes.js';
import { StoreService } from './store.service.js';

export function createStoreModule(client: AppSupabaseClient) {
  const service = new StoreService(new SupabaseStoreRepository(client));
  return createStoreRoutes(createStoreController(service));
}
