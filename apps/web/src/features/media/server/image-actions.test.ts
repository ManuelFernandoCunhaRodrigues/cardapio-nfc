import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminActionMocks as mocks, formDataFrom } from '@/test-support/admin-action-mocks';

vi.mock('@/lib/api/admin-api-client', () =>
  import('@/test-support/admin-action-mocks').then((module) => module.adminApiModule),
);
vi.mock('@/lib/cache/invalidate-public-cache', () =>
  import('@/test-support/admin-action-mocks').then((module) => module.publicCacheModule),
);
vi.mock('@/lib/cache/refresh-admin-panel', () =>
  import('@/test-support/admin-action-mocks').then((module) => module.adminPanelCacheModule),
);

import {
  removeHighlightImage,
  removeProductImage,
  uploadHighlightImage,
  uploadProductImage,
} from './image-actions';

const productId = '22222222-2222-4222-8222-222222222222';
const highlightId = '33333333-3333-4333-8333-333333333333';
const photo = new File([new Uint8Array([1, 2, 3])], 'foto.webp', { type: 'image/webp' });

beforeEach(() => vi.clearAllMocks());

describe('Server Actions de foto', () => {
  it('envia a foto do produto para a API e devolve o caminho salvo', async () => {
    mocks.upload.mockResolvedValue('products/abc');

    const state = await uploadProductImage(
      { status: 'idle' },
      formDataFrom({ product_id: productId, image: photo }),
    );

    expect(state).toEqual({
      status: 'success',
      message: 'Foto otimizada e salva com sucesso.',
      path: 'products/abc',
    });
    const [path, body] = mocks.upload.mock.calls[0] as [string, FormData];
    expect(path).toBe(`/v1/admin/products/${productId}/image`);
    expect(body.get('image')).toBeInstanceOf(File);
  });

  it('envia a foto do destaque para a rota do destaque', async () => {
    mocks.upload.mockResolvedValue('highlights/xyz');

    await uploadHighlightImage(
      { status: 'idle' },
      formDataFrom({ highlight_id: highlightId, image: photo }),
    );

    expect(mocks.upload).toHaveBeenCalledWith(
      `/v1/admin/highlights/${highlightId}/image`,
      expect.any(FormData),
    );
  });

  it.each([
    [
      'produto',
      removeProductImage,
      { product_id: productId },
      `/v1/admin/products/${productId}/image`,
    ],
    [
      'destaque',
      removeHighlightImage,
      { highlight_id: highlightId },
      `/v1/admin/highlights/${highlightId}/image`,
    ],
  ] as const)('remove a foto do %s pela API', async (_label, action, fields, path) => {
    mocks.write.mockResolvedValue(undefined);

    const state = await action({ status: 'idle' }, formDataFrom(fields));

    expect(state).toMatchObject({ status: 'success', message: 'Foto removida.' });
    expect(mocks.write).toHaveBeenCalledWith('DELETE', path);
    expect(mocks.refreshAdminPanel).toHaveBeenCalledOnce();
  });
});
