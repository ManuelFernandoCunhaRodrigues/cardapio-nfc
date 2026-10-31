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
  createProduct,
  deleteProduct,
  reorderProduct,
  setProductSituation,
  updateProduct,
} from './actions';

const productId = '22222222-2222-4222-8222-222222222222';
const productFields = {
  name: 'Coxinha',
  description: '',
  price: '8,90',
  category_id: '11111111-1111-4111-8111-111111111111',
  badge: '',
  is_active: 'on',
};

beforeEach(() => vi.clearAllMocks());

describe('Server Actions de produtos', () => {
  it('cria o produto mandando o preço como texto e devolve o id', async () => {
    mocks.create.mockResolvedValue(productId);

    const state = await createProduct({ status: 'idle' }, formDataFrom(productFields));

    expect(state).toMatchObject({ status: 'success', entityId: productId });
    expect(mocks.create).toHaveBeenCalledWith('/v1/admin/products', {
      ...productFields,
      badge: null,
      is_active: true,
      is_available: false,
    });
  });

  it.each([
    ['edição', updateProduct, 'PUT', `/v1/admin/products/${productId}`, {}],
    [
      'situação',
      setProductSituation,
      'PUT',
      `/v1/admin/products/${productId}/situation`,
      { situation: 'hidden' },
    ],
    ['ordem', reorderProduct, 'POST', `/v1/admin/products/${productId}/order`, { direction: 'up' }],
    ['exclusão', deleteProduct, 'DELETE', `/v1/admin/products/${productId}`, {}],
  ] as const)(
    'a %s chama a rota do produto e atualiza o cardápio',
    async (_label, action, method, path, fields) => {
      mocks.write.mockResolvedValue(undefined);

      const state = await action(
        { status: 'idle' },
        formDataFrom({ ...productFields, ...fields, id: productId }),
      );

      expect(state.status).toBe('success');
      expect(mocks.write).toHaveBeenCalledWith(
        method,
        path,
        ...(method === 'DELETE' ? [] : [expect.anything()]),
      );
      expect(mocks.invalidateMenuCache).toHaveBeenCalledWith(productId);
      expect(mocks.refreshAdminPanel).toHaveBeenCalledOnce();
    },
  );
});
