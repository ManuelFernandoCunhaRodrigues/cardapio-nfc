import { describe, expect, it } from 'vitest';

import { sortProductsByAvailability, sortProductsForHome } from '@/lib/menu/sort';
import type { MenuProduct } from '@/lib/menu/types';

const base = {
  id: 'b76b1cd3-7525-4f9f-8e90-0c14e66bd00a',
  category_id: '7a1af5ec-0800-4201-9df3-e58f4d8a2bd4',
  description: null,
  price_cents: 700,
  image_path: null,
  video_path: null,
  is_active: true,
  is_available: true,
};

describe('ordenacao do cardapio', () => {
  it('prioriza mais pedidos e mantem a ordem editorial nos demais', () => {
    const products: MenuProduct[] = [
      { ...base, name: 'Novo', badge: 'novo', sort_order: 1 },
      {
        ...base,
        id: 'c76b1cd3-7525-4f9f-8e90-0c14e66bd00a',
        name: 'Mais pedido',
        badge: 'mais_pedido',
        sort_order: 20,
      },
      {
        ...base,
        id: 'd76b1cd3-7525-4f9f-8e90-0c14e66bd00a',
        name: 'Quentinho',
        badge: 'quentinho',
        sort_order: 2,
      },
    ];
    expect(sortProductsForHome(products).map((product) => product.name)).toEqual([
      'Mais pedido',
      'Novo',
      'Quentinho',
    ]);
  });

  it('move indisponiveis para o fim sem perder sort_order nem estabilidade', () => {
    const products: MenuProduct[] = [
      {
        ...base,
        id: 'a76b1cd3-7525-4f9f-8e90-0c14e66bd00a',
        name: 'Indisponivel 1',
        sort_order: 1,
        is_available: false,
        badge: null,
      },
      { ...base, name: 'Disponivel 2', sort_order: 2, badge: null },
      {
        ...base,
        id: 'c76b1cd3-7525-4f9f-8e90-0c14e66bd00a',
        name: 'Disponivel 1',
        sort_order: 1,
        badge: null,
      },
      {
        ...base,
        id: 'd76b1cd3-7525-4f9f-8e90-0c14e66bd00a',
        name: 'Indisponivel 1b',
        sort_order: 1,
        is_available: false,
        badge: null,
      },
    ];
    expect(sortProductsByAvailability(products).map((product) => product.name)).toEqual([
      'Disponivel 1',
      'Disponivel 2',
      'Indisponivel 1',
      'Indisponivel 1b',
    ]);
  });
});
