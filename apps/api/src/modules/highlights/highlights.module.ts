import type {
  AppSupabaseClient,
  SupabaseClientFactory,
} from '../../shared/supabase/supabase-client-factory.js';
import { createHighlightsController } from './highlights.controller.js';
import { SupabaseHighlightsRepository } from './highlights.repository.js';
import { createHighlightsRoutes } from './highlights.routes.js';
import { HighlightsService } from './highlights.service.js';
import { compressImageToWebp } from '../media/image/image-compressor.js';
import { createImageController } from '../media/image/image.controller.js';
import { SupabaseImageRepository } from '../media/image/image.repository.js';
import { ImageService } from '../media/image/image.service.js';

function createHighlightsService(client: AppSupabaseClient) {
  return new HighlightsService(new SupabaseHighlightsRepository(client));
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
