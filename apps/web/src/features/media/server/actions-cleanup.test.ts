import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialMediaActionState } from './action-state';
import { removeProductVideo } from './actions';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createClient: vi.fn(),
  report: vi.fn(),
}));

vi.mock('@/features/auth/server/require-admin', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn(), updateTag: vi.fn() }));
vi.mock('@/lib/observability', () => ({ reportServerError: mocks.report }));

const productId = '11111111-1111-4111-8111-111111111111';
const videoPath = 'products/shared/video.mp4';

function form() {
  const data = new FormData();
  data.set('product_id', productId);
  return data;
}

type ReferenceResult = { data: Array<{ id: string }> | null; error: Error | null };

function fakeClient(
  options: { references?: ReferenceResult; updated?: Array<{ id: string }> } = {},
) {
  const remove = vi.fn(async () => ({ data: null, error: null }));
  const client = {
    storage: { from: () => ({ list: async () => ({ data: [], error: null }), remove }) },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { video_path: videoPath }, error: null }),
          maybeSingle: async () => ({ data: { video_path: null }, error: null }),
          neq: () => ({
            limit: async () => options.references ?? { data: [], error: null },
          }),
          limit: async () => ({ data: [], error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          select: async () => ({ data: options.updated ?? [{ id: productId }], error: null }),
        }),
      }),
    }),
  };
  return { client, remove };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ userId: 'admin', name: 'Admin' });
});

describe('remoção segura de vídeo', () => {
  it('não remove o objeto quando a consulta de referências falha', async () => {
    const error = new Error('consulta indisponível');
    const fake = fakeClient({ references: { data: null, error } });
    mocks.createClient.mockResolvedValue(fake.client);

    await expect(removeProductVideo(initialMediaActionState, form())).resolves.toMatchObject({
      status: 'success',
    });
    expect(fake.remove).not.toHaveBeenCalled();
    expect(mocks.report).toHaveBeenCalledWith('media_video_reference_check_failed', error);
  });

  it('não remove caminho ainda referenciado por outro produto', async () => {
    const fake = fakeClient({ references: { data: [{ id: 'other' }], error: null } });
    mocks.createClient.mockResolvedValue(fake.client);

    await removeProductVideo(initialMediaActionState, form());

    expect(fake.remove).not.toHaveBeenCalled();
  });

  it('retorna erro quando a atualização altera zero linhas', async () => {
    const fake = fakeClient({ updated: [] });
    mocks.createClient.mockResolvedValue(fake.client);

    await expect(removeProductVideo(initialMediaActionState, form())).resolves.toMatchObject({
      status: 'error',
    });
    expect(fake.remove).not.toHaveBeenCalled();
  });
});
