import type { MenuProduct } from '@/lib/menu/types';

export function sortProductsForHome(products: MenuProduct[]): MenuProduct[] {
  return [...products].sort((a, b) => {
    const badgeDifference = Number(b.badge === 'mais_pedido') - Number(a.badge === 'mais_pedido');
    return badgeDifference || a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR');
  });
}
