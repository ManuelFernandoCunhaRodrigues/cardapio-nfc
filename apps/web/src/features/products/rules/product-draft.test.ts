import { describe, expect, it } from 'vitest';

import type { AdminProduct } from '@salgae/core/contracts/admin-api';

import { isProductFormDirty, productDraftFrom, validateProductDraft } from './product-draft';

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_CATEGORY_ID = '22222222-2222-4222-8222-222222222222';

const product: AdminProduct = {
  id: '33333333-3333-4333-8333-333333333333',
  category_id: CATEGORY_ID,
  name: 'Coxinha',
  slug: 'coxinha',
  description: 'Frango com catupiry',
  price_cents: 890,
  image_path: null,
  video_path: null,
  badge: null,
  sort_order: 0,
  is_active: true,
  is_available: true,
  category: { name: 'Coxinhas', slug: 'coxinhas' },
};

const saved = productDraftFrom(product, OTHER_CATEGORY_ID);

function dirtyWith(changes: Partial<typeof saved>, hasPreparedMedia = false) {
  return isProductFormDirty({ saved, current: { ...saved, ...changes }, hasPreparedMedia });
}

describe('rascunho do produto', () => {
  it('parte do produto salvo ou, no novo, dos padrões do formulário', () => {
    expect(saved).toEqual({
      name: 'Coxinha',
      price: '8,90',
      categoryId: CATEGORY_ID,
      badge: null,
      situation: 'menu',
      description: 'Frango com catupiry',
    });
    expect(productDraftFrom(undefined, CATEGORY_ID)).toEqual({
      name: '',
      price: '',
      categoryId: CATEGORY_ID,
      badge: null,
      situation: 'menu',
      description: '',
    });
  });

  it('marca como alterado quando só a categoria, o selo ou a situação mudam', () => {
    expect(dirtyWith({ categoryId: OTHER_CATEGORY_ID })).toBe(true);
    expect(dirtyWith({ badge: 'novo' })).toBe(true);
    expect(dirtyWith({ situation: 'unavailable' })).toBe(true);
  });

  it('marca como alterado ao mudar nome, preço ou descrição', () => {
    expect(dirtyWith({ name: 'Coxinha grande' })).toBe(true);
    expect(dirtyWith({ price: '9,90' })).toBe(true);
    expect(dirtyWith({ price: 'preço inválido' })).toBe(true);
    expect(dirtyWith({ description: '' })).toBe(true);
  });

  it('não marca quando a alteração é desfeita ou só muda a forma de escrever', () => {
    expect(dirtyWith({})).toBe(false);
    expect(dirtyWith({ price: 'R$ 8,9' })).toBe(false);
    expect(dirtyWith({ name: ' Coxinha ', description: 'Frango com catupiry  ' })).toBe(false);
  });

  it('conta a foto ou o vídeo guardados para o produto novo', () => {
    expect(dirtyWith({}, true)).toBe(true);
  });
});

describe('validação do rascunho antes de enviar', () => {
  it('aceita um produto completo', () => {
    expect(validateProductDraft(saved)).toBeNull();
  });

  it('aponta todos os campos inválidos de uma vez, com os textos da API', () => {
    expect(
      validateProductDraft({ ...saved, name: 'X', price: 'oito reais', categoryId: '' }),
    ).toEqual({
      name: ['Informe o nome do produto.'],
      price: ['Informe um preço válido, como R$ 8,90.'],
      category_id: ['Escolha uma categoria válida.'],
    });
    expect(validateProductDraft({ ...saved, price: '  ' })).toEqual({
      price: ['Informe o preço.'],
    });
  });
});
