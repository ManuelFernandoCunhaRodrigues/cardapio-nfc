import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory.js';
import { createHealthController } from './health.controller.js';
import { SupabaseHealthRepository } from './health.repository.js';
import { createHealthRoutes } from './health.routes.js';
import { HealthService } from './health.service.js';

export function createHealthModule(supabase: AppSupabaseClient) {
  const repository = new SupabaseHealthRepository(supabase);
  const service = new HealthService(repository);
  return createHealthRoutes(createHealthController(service));
}
