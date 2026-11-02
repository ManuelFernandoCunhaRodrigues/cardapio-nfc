import type { MenuCategory, MenuProduct } from '@/features/menu/types';

export function normalizeMenuSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

export function filterMenuProducts(
  products: MenuProduct[],
  query: string,
  categories: readonly MenuCategory[] = [],
): MenuProduct[] {
  const normalizedQuery = normalizeMenuSearch(query);
  if (!normalizedQuery) return products;
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  return products.filter((product) =>
    normalizeMenuSearch(
      `${product.name} ${product.description ?? ''} ${categoryNames.get(product.category_id) ?? ''}`,
    ).includes(normalizedQuery),
  );
}
