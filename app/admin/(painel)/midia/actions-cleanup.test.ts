import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialMediaActionState } from './action-state';
import { removeProductImage, removeProductVideo } from './actions';

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  report: vi.fn(),
}));

vi.mock('@/lib/admin/require-admin', () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.createClient }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/observability', () => ({ reportServerError: mocks.report }));

const productId = '11111111-1111-4111-8111-111111111111';
const imagePath = 'products/shared/image';
const videoPath = 'products/shared/video.mp4';

function form() {
  const data = new FormData();
  data.set('product_id', productId);
  return data;
}

type ReferenceResult = { data: Array<{ id: string }> | null; error: Error | null };

function fakeClient(
  options: {
    imageReferences?: Partial<Record<'products' | 'highlights' | 'categories', ReferenceResult>>;
    videoReferences?: ReferenceResult;
    videoUpdateRows?: Array<{ id: string }>;
  } = {},
) {
  const remove = vi.fn(async () => ({ data: null, error: null }));
  const defaultReferences: ReferenceResult = { data: [], error: null };
  const client = {
    storage: {
      from: () => ({
        list: async () => ({ data: [], error: null }),
        remove,
      }),
    },
    from: (table: string) => {
      if (table === 'audit_logs') return { insert: async () => ({ error: null }) };
      return {
        select: (columns: string) => ({
          eq: (column: string) => {
            const limit = async () => {
              if (columns !== 'id') return defaultReferences;
              if (column === 'video_path') return options.videoReferences ?? defaultReferences;
              return (
                options.imageReferences?.[table as 'products' | 'highlights' | 'categories'] ??
                defaultReferences
              );
            };
            return {
              single: async () =>
                columns === 'video_path'
                  ? { data: { video_path: videoPath }, error: null }
                  : { data: { image_path: imagePath, video_path: null }, error: null },
              maybeSingle: async () => ({ data: { video_path: null }, error: null }),
              neq: () => ({ limit }),
              limit,
            };
          },
        }),
        update: (values: Record<string, unknown>) => ({
          eq: () =>
            'video_path' in values
              ? {
                  select: async () => ({
                    data: options.videoUpdateRows ?? [{ id: productId }],
                    error: null,
                  }),
                }
              : Promise.resolve({ error: null }),
        }),
      };
    },
  };
  return { client, remove };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ userId: 'admin', name: 'Admin' });
});

describe('remoção segura de vídeo', () => {
  it('não remove o objeto quando a consulta de referências falha', async () => {
    const referenceError = new Error('consulta indisponível');
    const fake = fakeClient({ videoReferences: { data: null, error: referenceError } });
    mocks.createClient.mockResolvedValue(fake.client);

    await expect(removeProductVideo(initialMediaActionState, form())).resolves.toMatchObject({
      status: 'success',
    });
    expect(fake.remove).not.toHaveBeenCalled();
    expect(mocks.report).toHaveBeenCalledWith('media_video_reference_check_failed', referenceError);
  });

  it('não remove caminho ainda referenciado por outro produto', async () => {
    const fake = fakeClient({ videoReferences: { data: [{ id: 'outro' }], error: null } });
    mocks.createClient.mockResolvedValue(fake.client);

    await expect(removeProductVideo(initialMediaActionState, form())).resolves.toMatchObject({
      status: 'success',
    });
    expect(fake.remove).not.toHaveBeenCalled();
  });

  it('retorna erro e não toca no Storage quando o update altera zero linhas', async () => {
    const fake = fakeClient({ videoUpdateRows: [] });
    mocks.createClient.mockResolvedValue(fake.client);

    await expect(removeProductVideo(initialMediaActionState, form())).resolves.toMatchObject({
      status: 'error',
    });
    expect(fake.remove).not.toHaveBeenCalled();
  });
});

describe('remoção segura de fotos', () => {
  it.each([
    ['products', { data: [], error: new Error('products falhou') }],
    ['highlights', { data: null, error: null }],
    ['categories', { data: [], error: new Error('categories falhou') }],
  ] as const)('falha fechado quando a consulta de %s não é confiável', async (table, result) => {
    const fake = fakeClient({ imageReferences: { [table]: result } });
    mocks.createClient.mockResolvedValue(fake.client);

    await expect(removeProductImage(initialMediaActionState, form())).resolves.toMatchObject({
      status: 'success',
    });
    expect(fake.remove).not.toHaveBeenCalled();
    expect(mocks.report).toHaveBeenCalledWith(
      'media_image_reference_check_failed',
      expect.any(Error),
    );
  });

  it('preserva a foto quando qualquer tabela ainda referencia o caminho', async () => {
    const fake = fakeClient({
      imageReferences: { highlights: { data: [{ id: 'outro' }], error: null } },
    });
    mocks.createClient.mockResolvedValue(fake.client);

    await expect(removeProductImage(initialMediaActionState, form())).resolves.toMatchObject({
      status: 'success',
    });
    expect(fake.remove).not.toHaveBeenCalled();
  });
});
