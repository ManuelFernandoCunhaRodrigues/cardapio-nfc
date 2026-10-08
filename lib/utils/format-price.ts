export function formatPriceBRL(priceCents: number): string {
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    throw new Error('O preço deve ser um inteiro não negativo em centavos.');
  }

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(priceCents / 100);
}
