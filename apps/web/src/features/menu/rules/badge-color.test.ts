import { describe, expect, it } from 'vitest';

import { badgeColor } from './badge-color';

describe('badgeColor', () => {
  it('mantém a cor de cada selo público', () => {
    expect(badgeColor).toEqual({
      mais_pedido: 'bg-ink',
      novo: 'bg-green',
      quentinho: 'bg-brand-strong',
    });
  });
});
