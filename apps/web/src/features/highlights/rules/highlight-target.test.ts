import { describe, expect, it } from 'vitest';

import {
  describeHighlightTarget,
  findTargetProduct,
  highlightTargetOptions,
} from './highlight-target';

const categories = [
  { id: 'c1', name: 'Coxinhas', slug: 'coxinhas', is_active: true },
  { id: 'c2', name: 'Bebidas', slug: 'bebidas', is_active: false },
];
const coxinhaId = '11111111-1111-4111-8111-111111111111';
const products = [
  { id: coxinhaId, name: 'Coxinha', slug: 'coxinha', is_active: true, category_id: 'c1' },
  { id: 'p2', name: 'Kibe', slug: 'kibe', is_active: false, category_id: 'c1' },
  { id: 'p3', name: 'Suco', slug: 'suco', is_active: true, category_id: 'c2' },
];

describe('highlightTargetOptions', () => {
  it('oferece só categorias e produtos que aparecem no cardápio', () => {
    const options = highlightTargetOptions(categories, products);
    expect(options.categories.map((category) => category.slug)).toEqual(['coxinhas']);
    expect(options.products.map((product) => product.slug)).toEqual(['coxinha']);
  });
});

describe('findTargetProduct', () => {
  it('acha pelo slug e, nos destaques antigos, pelo id', () => {
    expect(findTargetProduct(products, 'coxinha')?.name).toBe('Coxinha');
    expect(findTargetProduct(products, coxinhaId)?.name).toBe('Coxinha');
    expect(findTargetProduct(products, 'nao-existe')).toBeUndefined();
  });
});

describe('describeHighlightTarget', () => {
  it('diz para onde o banner leva', () => {
    expect(describeHighlightTarget('/cardapio', categories, products)).toEqual({
      label: 'Cardápio inteiro',
      status: 'ok',
    });
    expect(describeHighlightTarget(null, categories, products).label).toBe('Cardápio inteiro');
    expect(describeHighlightTarget('/cardapio#coxinhas', categories, products)).toEqual({
      label: 'Coxinhas',
      status: 'ok',
    });
    expect(describeHighlightTarget('/produto/coxinha', categories, products)).toEqual({
      label: 'Coxinha',
      status: 'ok',
    });
    expect(describeHighlightTarget(`/produto/${coxinhaId}`, categories, products).label).toBe(
      'Coxinha',
    );
    expect(describeHighlightTarget('https://exemplo.com', categories, products).label).toBe(
      'https://exemplo.com',
    );
  });

  it('avisa quando o destino está escondido do cardápio', () => {
    expect(describeHighlightTarget('/cardapio#bebidas', categories, products).status).toBe(
      'hidden',
    );
    expect(describeHighlightTarget('/produto/kibe', categories, products).status).toBe('hidden');
    // Produto ativo em categoria escondida também some do cardápio.
    expect(describeHighlightTarget('/produto/suco', categories, products).status).toBe('hidden');
  });

  it('avisa quando o destino deixou de existir', () => {
    expect(describeHighlightTarget('/cardapio#salgados', categories, products)).toEqual({
      label: 'Categoria que não existe mais',
      status: 'missing',
    });
    expect(describeHighlightTarget('/produto/pastel', categories, products).status).toBe('missing');
  });
});
