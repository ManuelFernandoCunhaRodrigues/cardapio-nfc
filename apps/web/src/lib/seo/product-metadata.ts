import type { Metadata } from 'next';

import type { MenuProduct } from '@/features/menu/types';
import { formatPriceBRL } from '@salgae/core/rules/price';

import { buildShareMetadata } from './share-metadata';

export function getProductMetadata(
  product: MenuProduct | null,
  image: string | null,
  storeName: string,
): Metadata {
  if (!product) return { title: `Produto | ${storeName}` };

  return buildShareMetadata({
    title: `${product.name} | ${storeName}`,
    description:
      product.description ||
      `Conheça ${product.name} por ${formatPriceBRL(product.price_cents)} na ${storeName}.`,
    siteName: storeName,
    path: `/produto/${product.slug}`,
    image,
  });
}
