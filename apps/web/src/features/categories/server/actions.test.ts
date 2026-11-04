import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  write: vi.fn(),
  invalidateMenuCache: vi.fn(),
  refreshAdminPanel: vi.fn(),
}));

vi.mock('@/lib/api/admin-api-client', () => ({
  adminApi: () => ({ create: mocks.create, write: mocks.write }),
}));
vi.mock('@/lib/cache/invalidate-public-cache', () => ({
  invalidateMenuCache: mocks.invalidateMenuCache,
}));
vi.mock('@/lib/cache/refresh-admin-panel', () => ({ refreshAdminPanel: mocks.refreshAdminPanel }));

import { createCategory, updateCategory } from './actions';

const categoryId = '44444444-4444-4444-8444-444444444444';

function categoryForm(fields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  return formData;
}

beforeEach(() => vi.clearAllMocks());

describe('Server Actions de categorias', () => {
  it('devolve o id da categoria criada para a tela enviar a foto em seguida', async () => {
    mocks.create.mockResolvedValue(categoryId);

    const state = await createCategory(
      { status: 'idle' },
      categoryForm({ name: 'Coxinhas', slug: 'coxinhas', description: '', is_active: 'on' }),
    );

    expect(state).toEqual({
      status: 'success',
      message: 'Categoria criada com sucesso.',
      entityId: categoryId,
    });
  });

  it('devolve o id da categoria editada para a tela enviar a foto em seguida', async () => {
    mocks.write.mockResolvedValue(undefined);

    const state = await updateCategory(
      { status: 'idle' },
      categoryForm({ id: categoryId, name: 'Coxinhas', slug: 'coxinhas', description: '' }),
    );

    expect(state).toMatchObject({ status: 'success', entityId: categoryId });
    expect(mocks.write).toHaveBeenCalledWith('PUT', `/v1/admin/categories/${categoryId}`, {
      name: 'Coxinhas',
      slug: 'coxinhas',
      description: '',
      is_active: false,
    });
  });
});
