import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory';
import { createHealthController } from './health.controller';
import { SupabaseHealthRepository } from './health.repository';
import { createHealthRoutes } from './health.routes';
import { HealthService } from './health.service';

export function createHealthModule(supabase: AppSupabaseClient) {
  const repository = new SupabaseHealthRepository(supabase);
  const service = new HealthService(repository);
  return createHealthRoutes(createHealthController(service));
}
