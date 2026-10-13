import { describe, expect, it } from 'vitest';

import { parsePriceBRL } from './parse-price';

describe('parsePriceBRL', () => {
  it.each([
    ['8,90', 890],
    ['8.90', 890],
    ['R$ 8,90', 890],
    ['1.234,56', 123456],
    ['1.000', 100000],
    ['0', 0],
  ])('converte %s em centavos', (value, expected) => {
    expect(parsePriceBRL(value)).toBe(expected);
  });

  it.each(['', 'R$ ', '8,999', '-8,90', 'oito reais'])('rejeita %s', (value) => {
    expect(parsePriceBRL(value)).toBeNull();
  });
});
