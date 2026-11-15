import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiRequestError } from '@/lib/api/api-request-error';

import { initialMediaActionState } from './action-state';

const mocks = vi.hoisted(() => ({
  prepareVideo: vi.fn(),
  write: vi.fn(),
  invalidateMenuCache: vi.fn(),
  refreshAdminPanel: vi.fn(),
  report: vi.fn(),
}));

vi.mock('@/lib/api/admin-api-client', () => ({
  adminApi: () => ({ prepareVideo: mocks.prepareVideo, write: mocks.write }),
}));
vi.mock('@/lib/cache/invalidate-public-cache', () => ({
  invalidateMenuCache: mocks.invalidateMenuCache,
}));
vi.mock('@/lib/cache/refresh-admin-panel', () => ({
  refreshAdminPanel: mocks.refreshAdminPanel,
}));
vi.mock('@/lib/observability', () => ({ reportServerError: mocks.report }));

import { createProductVideoUpload, removeProductVideo } from './actions';

const productId = '11111111-1111-4111-8111-111111111111';

function form(values: Record<string, string>) {
  const result = new FormData();
  Object.entries(values).forEach(([key, value]) => result.set(key, value));
  return result;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prepareVideo.mockResolvedValue({
    path: `uploads/${productId}_22222222-2222-4222-8222-222222222222.mov`,
    signedUrl: '/object/upload/sign/teste',
    token: 'token',
  });
});

describe('actions de vídeo', () => {
  it('repassa a preparação do upload para a API', async () => {
    const result = await createProductVideoUpload(
      initialMediaActionState,
      form({ product_id: productId, mime_type: 'video/quicktime', size: '52428800' }),
    );

    expect(mocks.prepareVideo).toHaveBeenCalledWith(
      `/v1/admin/products/${productId}/video/upload`,
      { mimeType: 'video/quicktime', size: 52_428_800 },
    );
    expect(result).toMatchObject({
      status: 'success',
      signedUrl: '/object/upload/sign/teste',
      token: 'token',
    });
  });

  it('mostra a mensagem de validação devolvida pela API', async () => {
    mocks.prepareVideo.mockRejectedValue(
      new ApiRequestError(413, 'O vídeo deve ter no máximo 50 MB.'),
    );

    const result = await createProductVideoUpload(
      initialMediaActionState,
      form({ product_id: productId, mime_type: 'video/mp4', size: '52428801' }),
    );

    expect(result).toEqual({ status: 'error', message: 'O vídeo deve ter no máximo 50 MB.' });
  });

  it('remove pela API e invalida o catálogo', async () => {
    const result = await removeProductVideo(
      initialMediaActionState,
      form({ product_id: productId }),
    );

    expect(mocks.write).toHaveBeenCalledWith('DELETE', `/v1/admin/products/${productId}/video`);
    expect(mocks.invalidateMenuCache).toHaveBeenCalledWith(productId);
    expect(mocks.refreshAdminPanel).toHaveBeenCalled();
    expect(result).toEqual({ status: 'success', message: 'Vídeo removido.' });
  });
});
