import { describe, expect, it } from 'vitest';

import { categoryFormSchema } from './category';

describe('categoryFormSchema', () => {
  it('aceita os campos de uma categoria e normaliza descrição vazia', () => {
    const result = categoryFormSchema.safeParse({
      name: 'Porções',
      slug: 'porcoes',
      description: ' ',
      is_active: true,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.description).toBeNull();
  });

  it('rejeita slug fora do formato de URL', () => {
    expect(
      categoryFormSchema.safeParse({
        name: 'Porções',
        slug: 'Porções especiais',
        description: '',
        is_active: true,
      }).success,
    ).toBe(false);
  });
});
