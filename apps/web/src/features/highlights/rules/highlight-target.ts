import type { AdminCategory, AdminProduct } from '@salgae/core/contracts/admin-api';

import { highlightTargetKind } from '@/features/admin/rules/panel';

type TargetCategory = Pick<AdminCategory, 'id' | 'name' | 'slug' | 'is_active'>;
type TargetProduct = Pick<AdminProduct, 'id' | 'name' | 'slug' | 'is_active' | 'category_id'>;

/** `hidden`: existe, mas o cliente não vê. `missing`: foi excluído ou o endereço não confere. */
type HighlightTargetStatus = 'ok' | 'hidden' | 'missing';

export type HighlightTargetSummary = { label: string; status: HighlightTargetStatus };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Produto pelo slug ou, nos destaques antigos, pelo id. */
export function findTargetProduct<T extends Pick<AdminProduct, 'id' | 'slug'>>(
  products: readonly T[],
  value: string,
): T | undefined {
  const byId = UUID_PATTERN.test(value);
  return products.find((product) => (byId ? product.id === value : product.slug === value));
}

function categoryVisible(categories: readonly TargetCategory[], categoryId: string): boolean {
  return categories.some((category) => category.id === categoryId && category.is_active);
}

/** Só o que o cliente encontra no cardápio pode ser destino de um banner. */
export function highlightTargetOptions<C extends TargetCategory, P extends TargetProduct>(
  categories: readonly C[],
  products: readonly P[],
) {
  return {
    categories: categories.filter((category) => category.is_active),
    products: products.filter(
      (product) => product.is_active && categoryVisible(categories, product.category_id),
    ),
  };
}

/** Texto do cartão do destaque ("Leva para: Coxinha") e se o destino ainda aparece no cardápio. */
export function describeHighlightTarget(
  target: string | null,
  categories: readonly TargetCategory[],
  products: readonly TargetProduct[],
): HighlightTargetSummary {
  // Sem destino, o banner abre o cardápio (highlight-slide.tsx).
  const kind = highlightTargetKind(target);
  if (!target || kind === 'menu') return { label: 'Cardápio inteiro', status: 'ok' };
  if (kind === 'category') {
    const slug = target.slice('/cardapio#'.length);
    const category = categories.find((item) => item.slug === slug);
    if (!category) return { label: 'Categoria que não existe mais', status: 'missing' };
    return { label: category.name, status: category.is_active ? 'ok' : 'hidden' };
  }
  if (kind === 'product') {
    const product = findTargetProduct(products, target.slice('/produto/'.length));
    if (!product) return { label: 'Produto que não existe mais', status: 'missing' };
    const visible = product.is_active && categoryVisible(categories, product.category_id);
    return { label: product.name, status: visible ? 'ok' : 'hidden' };
  }
  return { label: target, status: 'ok' };
}
