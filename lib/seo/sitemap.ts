import type { MetadataRoute } from 'next';

import type { SiteEnv } from '@/lib/env';
import type { PublicSitemapProduct } from '@/lib/menu/get-public-menu';

export function buildSitemap(
  siteUrl: URL,
  products: PublicSitemapProduct[],
): MetadataRoute.Sitemap {
  const toUrl = (path: string) => new URL(path, siteUrl).toString();

  return [
    { url: toUrl('/') },
    { url: toUrl('/cardapio') },
    { url: toUrl('/info') },
    ...products.map((product) => ({
      url: toUrl(`/produto/${product.id}`),
      lastModified: new Date(product.updated_at),
    })),
  ];
}

export function getPublicSitemap(
  siteEnv: SiteEnv,
  siteUrl: URL | undefined,
  products: PublicSitemapProduct[],
): MetadataRoute.Sitemap {
  if (siteEnv !== 'production' || !siteUrl) return [];
  return buildSitemap(siteUrl, products);
}
