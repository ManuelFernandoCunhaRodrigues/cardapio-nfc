import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory';
import { createHighlightsController } from './highlights.controller';
import { SupabaseHighlightsRepository } from './highlights.repository';
import { createHighlightsRoutes } from './highlights.routes';
import { HighlightsService } from './highlights.service';
import { compressImageToWebp } from '../media/image/image-compressor';
import { createImageController } from '../media/image/image.controller';
import { SupabaseImageRepository } from '../media/image/image.repository';
import { ImageService } from '../media/image/image.service';

function createHighlightsService(client: AppSupabaseClient) {
  return new HighlightsService(
    new SupabaseHighlightsRepository(client, new SupabaseImageRepository(client)),
  );
}

function createImageService(client: AppSupabaseClient) {
  return new ImageService(new SupabaseImageRepository(client), compressImageToWebp);
}

export function createHighlightsModule(clients: SupabaseClientFactory) {
  return createHighlightsRoutes(
    clients,
    createHighlightsController(createHighlightsService),
    createImageController('highlight', createImageService),
  );
}
