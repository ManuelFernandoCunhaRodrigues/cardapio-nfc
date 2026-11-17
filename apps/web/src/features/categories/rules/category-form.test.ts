import { describe, expect, it } from 'vitest';

import { categoryFormMessage, categoryNameError, categorySlugFor } from './category-form';

describe('categorySlugFor', () => {
  it('gera o endereço pelo nome na criação', () => {
    expect(categorySlugFor('Salgados Assados', null)).toBe('salgados-assados');
  });

  it('mantém o endereço guardado ao renomear', () => {
    expect(categorySlugFor('Bebidas geladas', 'bebidas')).toBe('bebidas');
  });
});

describe('categoryNameError', () => {
  it('mostra o erro do nome quando houver', () => {
    expect(categoryNameError({ name: ['Informe o nome da categoria.'] })).toBe(
      'Informe o nome da categoria.',
    );
  });

  it('traduz o erro do endereço para o campo Nome', () => {
    expect(categoryNameError({ slug: ['Esse endereço curto já está em uso.'] })).toBe(
      'Já existe uma categoria com um nome parecido. Use outro nome.',
    );
    expect(categoryNameError({ slug: ['Use letras minúsculas, números e hífens.'] })).toBe(
      'Use um nome com pelo menos duas letras ou números.',
    );
    expect(categoryNameError(undefined)).toBeUndefined();
  });
});

describe('categoryFormMessage', () => {
  it('esconde o aviso geral quando o erro já está no Nome', () => {
    expect(
      categoryFormMessage({
        status: 'error',
        message: 'Esse endereço curto já está em uso. Escolha outro.',
        fieldErrors: { slug: ['Esse endereço curto já está em uso.'] },
      }),
    ).toBeUndefined();
  });

  it('mostra os outros erros e nada no sucesso', () => {
    expect(categoryFormMessage({ status: 'error', message: 'Sem conexão.' })).toBe('Sem conexão.');
    expect(
      categoryFormMessage({ status: 'success', message: 'Categoria criada.' }),
    ).toBeUndefined();
  });
});
