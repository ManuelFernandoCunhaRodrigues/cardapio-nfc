import { describe, expect, it } from 'vitest';

import { filterMenuProducts, normalizeMenuSearch } from '@/lib/menu/search';
import type { MenuCategory, MenuProduct } from '@/lib/menu/types';

const product = {
  id: 'b76b1cd3-7525-4f9f-8e90-0c14e66bd00a',
  category_id: '7a1af5ec-0800-4201-9df3-e58f4d8a2bd4',
  name: 'Coxinha Cremosa',
  slug: 'coxinha-cremosa',
  description: 'Frango com requeijão',
  price_cents: 700,
  image_path: null,
  video_path: null,
  badge: null,
  sort_order: 0,
  is_active: true,
  is_available: true,
} satisfies MenuProduct;
const category = {
  id: product.category_id,
  name: 'Salgados doces',
  slug: 'salgados-doces',
  image_path: null,
  sort_order: 0,
} satisfies MenuCategory;

describe('busca do cardapio', () => {
  it('ignora acentos e caixa', () => {
    expect(normalizeMenuSearch('  PORÇÃO  ')).toBe('porcao');
    expect(filterMenuProducts([product], 'CREMÓSA')).toEqual([product]);
  });

  it('encontra produtos pelo nome da categoria', () => {
    expect(filterMenuProducts([product], 'DOCES', [category])).toEqual([product]);
  });
});
