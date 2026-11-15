import { describe, expect, it } from 'vitest';

import { MAX_PRICE_CENTS, parsePriceBRL, priceMessages, readPriceInput } from './parse-price';

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

describe('readPriceInput', () => {
  it('aceita o preço no teto de R$ 99.999,99', () => {
    expect(readPriceInput('R$ 99.999,99')).toEqual({ ok: true, cents: MAX_PRICE_CENTS });
  });

  it.each(['R$ 100.000,00', '30.000.000,00', '99999999999'])(
    'recusa %s acima do teto com mensagem própria',
    (value) => {
      expect(readPriceInput(value)).toEqual({ ok: false, message: priceMessages.tooHigh });
    },
  );

  it('mantém a mensagem de preço ilegível', () => {
    expect(readPriceInput('oito reais')).toEqual({ ok: false, message: priceMessages.invalid });
  });

  it('o teto cabe na coluna integer do banco', () => {
    expect(MAX_PRICE_CENTS).toBeLessThanOrEqual(2_147_483_647);
  });
});
