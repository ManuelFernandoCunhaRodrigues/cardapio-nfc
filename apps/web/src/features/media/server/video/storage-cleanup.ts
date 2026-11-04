import type { ServerSupabaseClient } from '@/lib/supabase/server';

import { VIDEO_ORPHAN_AGE_MS } from './constants';

type StorageObject = { name: string; created_at?: string | null; updated_at?: string | null };
type StorageResult<T> = PromiseLike<{ data: T | null; error: unknown | null }>;

type VideoCleanupClientDouble = {
  storage: {
    from(bucket: string): {
      list(
        path: string,
        options: {
          limit: number;
          offset: number;
          sortBy: { column: string; order: 'asc' | 'desc' };
        },
      ): StorageResult<StorageObject[]>;
      remove(paths: string[]): StorageResult<unknown>;
    };
  };
  from(table: 'products'): {
    select(columns: string): {
      eq(
        column: string,
        value: string,
      ): {
        maybeSingle(): StorageResult<{ video_path: string | null }>;
        limit(limit: number): StorageResult<Array<{ id: string }>>;
      };
    };
  };
};

export type VideoCleanupClient = ServerSupabaseClient | VideoCleanupClientDouble;

type CleanupOptions = {
  productId?: string;
  cleanupUploads?: boolean;
  now?: number;
  pageSize?: number;
  onError?: (event: string, error: unknown) => void;
};

function isOldEnough(object: StorageObject, now: number): boolean {
  const timestamp = Date.parse(object.updated_at ?? object.created_at ?? '');
  return Number.isFinite(timestamp) && now - timestamp >= VIDEO_ORPHAN_AGE_MS;
}

async function listAll(
  client: VideoCleanupClientDouble,
  bucket: string,
  folder: string,
  pageSize: number,
) {
  const result: StorageObject[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.storage.from(bucket).list(folder, {
      limit: pageSize,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    });
    if (page.error || !page.data) throw page.error ?? new Error('storage_list_failed');
    result.push(...page.data);
    if (page.data.length < pageSize) return result;
  }
}

async function cleanupUploads(client: VideoCleanupClientDouble, now: number, pageSize: number) {
  const objects = await listAll(client, 'product-video-uploads', 'uploads', pageSize);
  const paths = objects
    .filter((object) => isOldEnough(object, now))
    .map((object) => `uploads/${object.name}`);
  if (paths.length === 0) return;
  const result = await client.storage.from('product-video-uploads').remove(paths);
  if (result.error) throw result.error;
}

async function cleanupProduct(
  client: VideoCleanupClientDouble,
  productId: string,
  now: number,
  pageSize: number,
) {
  const folder = `products/${productId}`;
  const objects = await listAll(client, 'product-videos', folder, pageSize);
  for (const object of objects) {
    if (!isOldEnough(object, now)) continue;
    const path = `${folder}/${object.name}`;
    // As consultas são deliberadamente refeitas para cada remoção: uma corrida
    // nunca pode transformar o vídeo atual em órfão durante a faxina.
    const current = await client
      .from('products')
      .select('video_path')
      .eq('id', productId)
      .maybeSingle();
    if (current.error || current.data?.video_path === path) continue;
    const references = await client.from('products').select('id').eq('video_path', path).limit(1);
    if (references.error || references.data === null || references.data.length > 0) continue;
    const removed = await client.storage.from('product-videos').remove([path]);
    if (removed.error) throw removed.error;
  }
}

/** Erro de listagem cancela somente a faxina correspondente; nunca equivale a pasta vazia. */
type CleanupVideoOrphans = {
  (client: ServerSupabaseClient, options?: CleanupOptions): Promise<void>;
  (client: VideoCleanupClientDouble, options?: CleanupOptions): Promise<void>;
};

const cleanupVideoOrphansImplementation = async (
  client: VideoCleanupClientDouble,
  options: CleanupOptions = {},
): Promise<void> => {
  const now = options.now ?? Date.now();
  const pageSize = options.pageSize ?? 100;
  if (options.cleanupUploads) {
    try {
      await cleanupUploads(client, now, pageSize);
    } catch (error) {
      options.onError?.('media_video_upload_orphan_cleanup_failed', error);
    }
  }
  if (options.productId) {
    try {
      await cleanupProduct(client, options.productId, now, pageSize);
    } catch (error) {
      options.onError?.('media_video_orphan_cleanup_failed', error);
    }
  }
};

export const cleanupVideoOrphans = cleanupVideoOrphansImplementation as CleanupVideoOrphans;
