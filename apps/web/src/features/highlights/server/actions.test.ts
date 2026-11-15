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

import { createHighlight, updateHighlight } from './actions';

const highlightId = '33333333-3333-4333-8333-333333333333';

function highlightForm(fields: Record<string, string>) {
  const formData = new FormData();
  Object.entries(fields).forEach(([name, value]) => formData.set(name, value));
  return formData;
}

beforeEach(() => vi.clearAllMocks());

describe('Server Actions de destaques', () => {
  it('devolve o id do destaque criado para a tela enviar a imagem em seguida', async () => {
    mocks.create.mockResolvedValue(highlightId);

    const state = await createHighlight(
      { status: 'idle' },
      highlightForm({ title: 'Combo', description: '', target: '/cardapio', is_active: 'on' }),
    );

    expect(state).toEqual({
      status: 'success',
      message: 'Destaque criado com sucesso.',
      entityId: highlightId,
    });
    expect(mocks.create).toHaveBeenCalledWith('/v1/admin/highlights', {
      title: 'Combo',
      description: '',
      target: '/cardapio',
      is_active: true,
    });
  });

  it('invalida o cardápio e o painel depois de salvar', async () => {
    mocks.write.mockResolvedValue(undefined);

    await updateHighlight({ status: 'idle' }, highlightForm({ id: highlightId, title: 'Combo' }));

    expect(mocks.invalidateMenuCache).toHaveBeenCalledOnce();
    expect(mocks.refreshAdminPanel).toHaveBeenCalledOnce();
  });
});
