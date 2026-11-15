import type { AppSupabaseClient } from '../../../shared/supabase/supabase-client-factory';
import { compressImageToWebp } from './image-compressor';
import { SupabaseImageRepository } from './image.repository';
import { ImageService } from './image.service';

/** Service de foto usado por produtos, categorias e destaques, com o cliente da requisição. */
export function createImageService(client: AppSupabaseClient) {
  return new ImageService(new SupabaseImageRepository(client), compressImageToWebp);
}
