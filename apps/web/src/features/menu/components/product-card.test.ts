import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { MenuProduct } from '@/features/menu/types';

import { ProductCard } from './product-card';

const product = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'coxinha-de-frango',
  name: 'Coxinha de frango',
  description: 'Massa fina',
  price_cents: 1234,
  badge: null,
  is_available: true,
  image_path: null,
} as unknown as MenuProduct;

describe('ProductCard', () => {
  it('liga o cartão do cardápio à página do produto', () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { product }));
    expect(html).toContain('href="/produto/coxinha-de-frango"');
  });

  it('mostra a prévia do painel sem link, para não fazer prefetch da página pública', () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { product, preview: true }));
    expect(html).not.toContain('<a');
    expect(html).toContain('Coxinha de frango');
  });
});
