type ProductForHomeSorting = {
  badge: 'mais_pedido' | 'novo' | 'quentinho' | null;
  name: string;
  sort_order: number;
};

type ProductForFeaturing = ProductForHomeSorting & { is_available: boolean };

type ProductForAvailabilitySorting = {
  is_available: boolean;
  sort_order: number;
};

export function sortProductsForHome<T extends ProductForHomeSorting>(products: readonly T[]): T[] {
  return [...products].sort((a, b) => {
    const badgeDifference = Number(b.badge === 'mais_pedido') - Number(a.badge === 'mais_pedido');
    return badgeDifference || a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR');
  });
}

/** Vitrine de "Mais pedidos": só o que dá para pedir agora, na ordem da Início. */
export function selectFeaturedProducts<T extends ProductForFeaturing>(
  products: readonly T[],
  limit: number,
): T[] {
  return sortProductsForHome(products.filter((product) => product.is_available)).slice(0, limit);
}

export function sortProductsByAvailability<T extends ProductForAvailabilitySorting>(
  products: readonly T[],
): T[] {
  return products
    .map((product, originalIndex) => ({ product, originalIndex }))
    .sort(
      (a, b) =>
        Number(b.product.is_available) - Number(a.product.is_available) ||
        a.product.sort_order - b.product.sort_order ||
        a.originalIndex - b.originalIndex,
    )
    .map(({ product }) => product);
}
