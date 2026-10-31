import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory.js';
import { createHighlightsController } from './highlights.controller.js';
import { SupabaseHighlightsRepository } from './highlights.repository.js';
import { createHighlightsRoutes } from './highlights.routes.js';
import { HighlightsService } from './highlights.service.js';

function createHighlightsService(client: AppSupabaseClient) {
  return new HighlightsService(new SupabaseHighlightsRepository(client));
}

export function createHighlightsModule(clients: SupabaseClientFactory) {
  return createHighlightsRoutes(clients, createHighlightsController(createHighlightsService));
}
