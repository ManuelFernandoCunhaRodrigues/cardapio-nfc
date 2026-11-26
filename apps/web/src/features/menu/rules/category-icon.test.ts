import { describe, expect, it } from 'vitest';

import { getCategoryIcon } from './category-icon';

const emojiOf = (name: string, slug = '') => getCategoryIcon({ name, slug }).symbol;

describe('ícone de reserva da categoria', () => {
  it('usa o emoji certo para as categorias da loja', () => {
    expect(emojiOf('Pastéis', 'pasteis')).toBe('🥟');
    expect(emojiOf('Pizzas', 'pizzas')).toBe('🍕');
    expect(emojiOf('Esfihas', 'esfihas')).toBe('🫓');
    expect(emojiOf('Salgado', 'salgado')).toBe('🧆');
    expect(emojiOf('Coxinhas', 'coxinhas')).toBe('🍗');
    expect(emojiOf('Bebidas', 'bebidas')).toBe('🥤');
    expect(emojiOf('Doces', 'doces')).toBe('🍫');
  });

  it('reconhece a categoria pelo nome mesmo com endereço diferente e acento', () => {
    expect(emojiOf('Porções', 'acompanhamentos')).toBe('🍟');
    expect(emojiOf('Esfirras abertas', 'abertas')).toBe('🫓');
  });

  it('dá prioridade a combo quando o nome cita outro item', () => {
    expect(emojiOf('Combo de pizza', 'combo-pizza')).toBe('🍱');
  });

  it('cai na inicial do nome quando não reconhece a categoria', () => {
    expect(getCategoryIcon({ name: ' especiais da casa', slug: 'especiais' })).toEqual({
      kind: 'initial',
      symbol: 'E',
    });
  });
});
