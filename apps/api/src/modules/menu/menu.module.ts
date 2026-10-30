import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory.js';
import { createMenuController } from './menu.controller.js';
import { SupabaseMenuRepository } from './menu.repository.js';
import { createMenuRoutes } from './menu.routes.js';
import { MenuService } from './menu.service.js';

export function createMenuModule(client: AppSupabaseClient) {
  const service = new MenuService(new SupabaseMenuRepository(client));
  return createMenuRoutes(createMenuController(service));
}
