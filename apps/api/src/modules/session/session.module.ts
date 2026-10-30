import type { SupabaseClientFactory } from '../../shared/supabase/supabase-client-factory.js';
import { createSessionController } from './session.controller.js';
import { createSessionRoutes } from './session.routes.js';
import { SessionService } from './session.service.js';

export function createSessionModule(clients: SupabaseClientFactory) {
  const service = new SessionService();
  return createSessionRoutes(clients, createSessionController(service));
}
