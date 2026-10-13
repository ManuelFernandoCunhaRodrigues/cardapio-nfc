import { beforeEach, describe, expect, it, vi } from 'vitest';

import { initialMediaActionState } from './action-state';
import { createProductVideoUpload } from './actions';

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

function form(values: Record<string, string>) {
  const result = new FormData();
  Object.entries(values).forEach(([key, value]) => result.set(key, value));
  return result;
}

function clientWithCover(hasCover = true) {
  const signed = vi.fn(async (path: string) => ({ data: { signedUrl: '/object/upload/sign/teste', token: 'token' }, error: null, path }));
  const client = {
    storage: {
      from: (bucket: string) => ({
        list: async () => ({ data: [], error: null }),
        remove: async () => ({ data: null, error: null }),
        createSignedUploadUrl: bucket === 'product-video-uploads' ? signed : vi.fn(),
      }),
    },
    from: () => ({
      select: (columns: string) => ({
        eq: () => ({
          single: async () => ({ data: columns === 'image_path' ? { image_path: hasCover ? 'products/capa' : null } : { video_path: null }, error: null }),
          maybeSingle: async () => ({ data: { video_path: null }, error: null }),
          limit: async () => ({ data: [], error: null }),
        }),
      }),
    }),
  };
  return { client, signed };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ userId: 'admin', name: 'Admin' });
});

describe('preparação do upload bruto de vídeo', () => {
  it('aceita MOV de até 50 MiB e assina no bucket privado com caminho plano', async () => {
    const fake = clientWithCover();
    mocks.createClient.mockResolvedValue(fake.client);
    const result = await createProductVideoUpload(initialMediaActionState, form({
      product_id: productId,
      mime_type: 'video/quicktime',
      size: '52428800',
    }));
    expect(result).toMatchObject({ status: 'success', signedUrl: '/object/upload/sign/teste', token: 'token' });
    expect(result.path).toMatch(new RegExp(`^uploads/${productId}_[0-9a-f-]{36}\\.mov$`));
    expect(fake.signed).toHaveBeenCalledWith(result.path);
  });

  it.each(['0', '52428801'])('recusa tamanho declarado %s antes de autorização/Storage', async (size) => {
    const result = await createProductVideoUpload(initialMediaActionState, form({ product_id: productId, mime_type: 'video/mp4', size }));
    expect(result.status).toBe('error');
    expect(mocks.requireAdmin).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('exige foto de capa antes de assinar', async () => {
    const fake = clientWithCover(false);
    mocks.createClient.mockResolvedValue(fake.client);
    const result = await createProductVideoUpload(initialMediaActionState, form({ product_id: productId, mime_type: 'video/webm', size: '1024' }));
    expect(result).toMatchObject({ status: 'error', message: expect.stringContaining('foto de capa') });
    expect(fake.signed).not.toHaveBeenCalled();
  });
});
