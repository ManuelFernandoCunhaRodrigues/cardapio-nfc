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
