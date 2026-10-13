import { describe, expect, it, vi } from 'vitest';

import { VIDEO_ORPHAN_AGE_MS } from './constants';
import { cleanupVideoOrphans, type VideoCleanupClient } from './storage-cleanup';

const productId = '11111111-1111-4111-8111-111111111111';
const now = Date.parse('2026-10-10T12:00:00.000Z');
const old = new Date(now - VIDEO_ORPHAN_AGE_MS).toISOString();
const recent = new Date(now - VIDEO_ORPHAN_AGE_MS + 1).toISOString();

describe('faxina segura de vídeos órfãos', () => {
  it('pagina, respeita idade e relê referências antes de apagar', async () => {
    const removed: Array<{ bucket: string; paths: string[] }> = [];
    const uploadPages = [
      [
        { name: 'velho.mp4', created_at: old },
        { name: 'novo.mov', created_at: recent },
      ],
      [{ name: 'velho-2.webm', updated_at: old }],
    ];
    const productObjects = [
      { name: 'atual.mp4', created_at: old },
      { name: 'compartilhado.mp4', created_at: old },
      { name: 'orfao.mp4', created_at: old },
      { name: 'novo.mp4', created_at: recent },
    ];
    const client = {
      storage: {
        from: (bucket: string) => ({
          list: async (_folder: string, options: { offset: number }) => ({
            data:
              bucket === 'product-video-uploads'
                ? (uploadPages[options.offset / 2] ?? [])
                : productObjects.slice(options.offset, options.offset + 2),
            error: null,
          }),
          remove: async (paths: string[]) => {
            removed.push({ bucket, paths });
            return { data: null, error: null };
          },
        }),
      },
      from: () => ({
        select: () => ({
          eq: (column: string, value: string) => ({
            maybeSingle: async () => ({
              data: { video_path: `products/${productId}/atual.mp4` },
              error: null,
            }),
            limit: async () => ({
              data:
                column === 'video_path' && value.endsWith('compartilhado.mp4')
                  ? [{ id: 'outro' }]
                  : [],
              error: null,
            }),
          }),
        }),
      }),
    } as unknown as VideoCleanupClient;

    await cleanupVideoOrphans(client, { cleanupUploads: true, productId, now, pageSize: 2 });
    expect(removed).toContainEqual({
      bucket: 'product-video-uploads',
      paths: ['uploads/velho.mp4', 'uploads/velho-2.webm'],
    });
    expect(removed).toContainEqual({
      bucket: 'product-videos',
      paths: [`products/${productId}/orfao.mp4`],
    });
    expect(removed.flatMap(({ paths }) => paths)).not.toContain(`products/${productId}/atual.mp4`);
    expect(removed.flatMap(({ paths }) => paths)).not.toContain(
      `products/${productId}/compartilhado.mp4`,
    );
  });

  it('trata erro de listagem como cancelamento da faxina, nunca como pasta vazia', async () => {
    const remove = vi.fn();
    const onError = vi.fn();
    const client = {
      storage: {
        from: () => ({ list: async () => ({ data: null, error: new Error('sem lista') }), remove }),
      },
      from: vi.fn(),
    } as unknown as VideoCleanupClient;
    await cleanupVideoOrphans(client, { cleanupUploads: true, productId, now, onError });
    expect(remove).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('removes old unreferenced videos when the product no longer exists', async () => {
    const remove = vi.fn(async () => ({ data: null, error: null }));
    const client = {
      storage: {
        from: () => ({
          list: async () => ({ data: [{ name: 'orfao.mp4', created_at: old }], error: null }),
          remove,
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    } as unknown as VideoCleanupClient;
    await cleanupVideoOrphans(client, { productId, now });
    expect(remove).toHaveBeenCalledWith([`products/${productId}/orfao.mp4`]);
  });

  it('does not remove anything when looking up the product fails', async () => {
    const remove = vi.fn(async () => ({ data: null, error: null }));
    const client = {
      storage: {
        from: () => ({
          list: async () => ({ data: [{ name: 'orfao.mp4', created_at: old }], error: null }),
          remove,
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: new Error('database unavailable') }),
            limit: async () => ({ data: [], error: null }),
          }),
        }),
      }),
    } as unknown as VideoCleanupClient;
    await cleanupVideoOrphans(client, { productId, now });
    expect(remove).not.toHaveBeenCalled();
  });
});
