import { describe, expect, it } from 'vitest';

import { sortProductsForHome } from '@/lib/menu/sort';
import type { MenuProduct } from '@/lib/menu/types';

const base = { id: 'b76b1cd3-7525-4f9f-8e90-0c14e66bd00a', category_id: '7a1af5ec-0800-4201-9df3-e58f4d8a2bd4', description: null, price_cents: 700, image_path: null, video_path: null, is_active: true, is_available: true };

describe('sortProductsForHome', () => {
  it('prioriza mais pedidos e mantém a ordem editorial nos demais', () => {
    const products: MenuProduct[] = [
      { ...base, name: 'Novo', badge: 'novo', sort_order: 1 },
      { ...base, id: 'c76b1cd3-7525-4f9f-8e90-0c14e66bd00a', name: 'Mais pedido', badge: 'mais_pedido', sort_order: 20 },
      { ...base, id: 'd76b1cd3-7525-4f9f-8e90-0c14e66bd00a', name: 'Quentinho', badge: 'quentinho', sort_order: 2 },
    ];
    expect(sortProductsForHome(products).map((product) => product.name)).toEqual(['Mais pedido', 'Novo', 'Quentinho']);
  });
});
