/**
 * Teto de negócio para o preço de um item: R$ 99.999,99. Fica bem abaixo do limite da coluna
 * `price_cents` (integer, até 2.147.483.647) e pega o zero a mais digitado por engano.
 */
export const MAX_PRICE_CENTS = 9_999_999;

export const priceMessages = {
  invalid: 'Informe um preço válido, como R$ 8,90.',
  tooHigh: 'O preço máximo é R$ 99.999,99. Confira se não sobrou um zero.',
} as const;

export type PriceReading = { ok: true; cents: number } | { ok: false; message: string };

/** Lê o preço digitado no formulário: converte para centavos e aplica o teto de negócio. */
export function readPriceInput(value: string): PriceReading {
  const cents = parsePriceBRL(value);
  if (cents === null) return { ok: false, message: priceMessages.invalid };
  if (cents > MAX_PRICE_CENTS) return { ok: false, message: priceMessages.tooHigh };
  return { ok: true, cents };
}

/** Converte formatos usuais de reais para um inteiro seguro em centavos. */
export function parsePriceBRL(value: string): number | null {
  const normalized = value
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');
  if (!normalized || !/^(?:\d{1,3}(?:\.\d{3})*|\d+)(?:[,.]\d{1,2})?$/.test(normalized)) return null;

  const dotIsThousands =
    !normalized.includes(',') &&
    normalized.includes('.') &&
    normalized.slice(normalized.lastIndexOf('.') + 1).length === 3;
  const separator = normalized.lastIndexOf(',') > normalized.lastIndexOf('.') ? ',' : '.';
  const hasDecimals = !dotIsThousands && (normalized.includes(',') || normalized.includes('.'));
  const [wholeRaw, decimals = ''] = hasDecimals ? normalized.split(separator) : [normalized];
  const whole = wholeRaw.replace(/[.,]/g, '');
  const cents = `${decimals}00`.slice(0, 2);
  const result = Number(whole) * 100 + Number(cents);
  return Number.isSafeInteger(result) && result >= 0 ? result : null;
}
