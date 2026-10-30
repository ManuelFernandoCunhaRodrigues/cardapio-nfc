import type { MetadataRoute } from 'next';
import type { PublicSitemapItem } from '@salgae/core/contracts/public-api';

import type { SiteEnv } from '@/lib/env';

export function buildSitemap(siteUrl: URL, products: PublicSitemapItem[]): MetadataRoute.Sitemap {
  const toUrl = (path: string) => new URL(path, siteUrl).toString();

  return [
    { url: toUrl('/') },
    { url: toUrl('/cardapio') },
    { url: toUrl('/info') },
    ...products.map((product) => ({
      url: toUrl(`/produto/${product.slug}`),
      lastModified: new Date(product.updated_at),
    })),
  ];
}

export function getPublicSitemap(
  siteEnv: SiteEnv,
  siteUrl: URL | undefined,
  products: PublicSitemapItem[],
): MetadataRoute.Sitemap {
  if (siteEnv !== 'production' || !siteUrl) return [];
  return buildSitemap(siteUrl, products);
}
