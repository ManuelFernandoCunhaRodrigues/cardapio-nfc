import type { AppSupabaseClient } from '../../../shared/supabase/supabase-client-factory';
import { reportServerError } from '../../../shared/observability';
import { compressVideoFile } from './compress';
import { cleanupVideoOrphans } from './storage-cleanup';
import { SupabaseVideoRepository } from './video.repository';
import { VideoService } from './video.service';

export function createVideoService(client: AppSupabaseClient) {
  return new VideoService(new SupabaseVideoRepository(client), compressVideoFile, (options) =>
    cleanupVideoOrphans(client, {
      ...options,
      onError: (event, error) => reportServerError({ event, error }),
    }),
  );
}
