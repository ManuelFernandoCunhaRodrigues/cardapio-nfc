import type { SupabaseClientFactory } from '../../shared/supabase/supabase-client-factory';
import { createSessionController } from './session.controller';
import { createSessionRoutes } from './session.routes';
import { SessionService } from './session.service';

export function createSessionModule(clients: SupabaseClientFactory) {
  const service = new SessionService();
  return createSessionRoutes(clients, createSessionController(service));
}
