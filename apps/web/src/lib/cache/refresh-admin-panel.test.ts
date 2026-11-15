import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { refreshAdminList, refreshAdminPanel } from './refresh-admin-panel';

beforeEach(() => vi.clearAllMocks());

describe('atualização do painel depois de salvar', () => {
  it('marca o painel inteiro, a partir do layout, para mudanças que aparecem em várias telas', () => {
    refreshAdminPanel();

    expect(mocks.revalidatePath).toHaveBeenCalledWith('/admin', 'layout');
  });

  it.each([
    ['products', '/admin/produtos'],
    ['categories', '/admin/categorias'],
    ['highlights', '/admin/destaques'],
  ] as const)('marca só a tela da lista de %s', (list, path) => {
    refreshAdminList(list);

    expect(mocks.revalidatePath).toHaveBeenCalledExactlyOnceWith(path);
  });
});
