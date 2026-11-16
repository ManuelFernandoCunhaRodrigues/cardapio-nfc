import type { MenuCategory, MenuProduct } from '@/features/menu/types';

/** Quantos "Mais pedidos" a Busca mostra antes de digitar. */
export const SEARCH_FEATURED_COUNT = 4;

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
  if (!normalizedQuery) return availableFirst(products);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  return availableFirst(
    products.filter((product) =>
      normalizeMenuSearch(
        `${product.name} ${product.description ?? ''} ${categoryNames.get(product.category_id) ?? ''}`,
      ).includes(normalizedQuery),
    ),
  );
}

// A lista vem na ordem do cardápio (categoria e posição). A ordem por posição de
// `sortProductsByAvailability` misturaria categorias, então aqui só os indisponíveis vão para o fim.
function availableFirst(products: readonly MenuProduct[]): MenuProduct[] {
  return [
    ...products.filter((product) => product.is_available),
    ...products.filter((product) => !product.is_available),
  ];
}
