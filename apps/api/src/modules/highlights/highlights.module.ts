import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory';
import { createHighlightsController } from './highlights.controller';
import { SupabaseHighlightsRepository } from './highlights.repository';
import { createHighlightsRoutes } from './highlights.routes';
import { HighlightsService } from './highlights.service';
import { createImageController } from '../media/image/image.controller';
import { SupabaseImageRepository } from '../media/image/image.repository';
import { createImageService } from '../media/image/image.module';

function createHighlightsService(client: AppSupabaseClient) {
  return new HighlightsService(
    new SupabaseHighlightsRepository(client, new SupabaseImageRepository(client)),
  );
}

export function createHighlightsModule(clients: SupabaseClientFactory) {
  return createHighlightsRoutes(
    clients,
    createHighlightsController(createHighlightsService),
    createImageController('highlight', createImageService),
  );
}
