import type { Product } from '@/features/products/schemas/product';

const labels = {
  mais_pedido: 'MAIS PEDIDO',
  novo: 'NOVO',
  quentinho: 'QUENTINHO',
} as const;

export function getBadgeLabel(badge: Product['badge']): string | null {
  return badge ? labels[badge] : null;
}
