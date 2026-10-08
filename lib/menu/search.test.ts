import { describe, expect, it } from 'vitest';

import { filterMenuProducts, normalizeMenuSearch } from '@/lib/menu/search';
import type { MenuProduct } from '@/lib/menu/types';

const product = { id: 'b76b1cd3-7525-4f9f-8e90-0c14e66bd00a', category_id: '7a1af5ec-0800-4201-9df3-e58f4d8a2bd4', name: 'Coxinha Cremosa', description: 'Frango com requeijão', price_cents: 700, image_path: null, video_path: null, badge: null, sort_order: 0, is_active: true, is_available: true } satisfies MenuProduct;

describe('busca do cardápio', () => {
  it('ignora acentos e caixa', () => {
    expect(normalizeMenuSearch('  PORÇÃO  ')).toBe('porcao');
    expect(filterMenuProducts([product], 'CREMÓSA')).toEqual([product]);
  });
});
