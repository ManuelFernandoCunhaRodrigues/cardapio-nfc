import { describe, expect, it } from 'vitest';

import { deleteCategoryBlockReason, hideCategoryWarning } from './category-impact';

describe('hideCategoryWarning', () => {
  it('diz quantos produtos somem do cardápio', () => {
    expect(hideCategoryWarning(1)).toBe(
      '1 produto deixará de aparecer no cardápio até você mostrar a categoria de novo.',
    );
    expect(hideCategoryWarning(4)).toBe(
      '4 produtos deixarão de aparecer no cardápio até você mostrar a categoria de novo.',
    );
  });

  it('não pergunta nada quando a categoria está vazia', () => {
    expect(hideCategoryWarning(0)).toBeNull();
  });
});

describe('deleteCategoryBlockReason', () => {
  it('explica o que fazer antes de excluir uma categoria com produtos', () => {
    expect(deleteCategoryBlockReason(1)).toBe(
      'Para excluir, mova o produto para outra categoria ou apenas esconda a categoria.',
    );
    expect(deleteCategoryBlockReason(3)).toBe(
      'Para excluir, mova os 3 produtos para outra categoria ou apenas esconda a categoria.',
    );
  });

  it('libera a exclusão da categoria vazia', () => {
    expect(deleteCategoryBlockReason(0)).toBeNull();
  });
});
