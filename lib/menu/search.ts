import type { MenuProduct } from '@/lib/menu/types';

export function normalizeMenuSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export function filterMenuProducts(products: MenuProduct[], query: string): MenuProduct[] {
  const normalizedQuery = normalizeMenuSearch(query);
  if (!normalizedQuery) return products;
  return products.filter((product) => normalizeMenuSearch(`${product.name} ${product.description ?? ''}`).includes(normalizedQuery));
}
