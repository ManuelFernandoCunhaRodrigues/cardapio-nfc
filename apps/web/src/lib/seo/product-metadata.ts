import type { Metadata } from 'next';

import type { MenuProduct } from '@/features/menu/types';
import { formatPriceBRL } from '@salgae/core/rules/price';

const defaultTitle = 'Produto | Salgaê';

export function getProductMetadata(product: MenuProduct | null, image: string | null): Metadata {
  if (!product) return { title: defaultTitle };

  const title = `${product.name} | Salgaê`;
  const description =
    product.description ||
    `Conheça ${product.name} por ${formatPriceBRL(product.price_cents)} na Salgaê.`;
  return {
    title,
    description,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: {
      title,
      description,
      url: `/produto/${product.slug}`,
      type: 'website',
      locale: 'pt_BR',
      siteName: 'Salgaê',
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
