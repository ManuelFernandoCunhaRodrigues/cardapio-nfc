import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory';
import { createMenuController } from './menu.controller';
import { SupabaseMenuRepository } from './menu.repository';
import { createMenuRoutes } from './menu.routes';
import { MenuService } from './menu.service';

export function createMenuModule(client: AppSupabaseClient) {
  const service = new MenuService(new SupabaseMenuRepository(client));
  return createMenuRoutes(createMenuController(service));
}
