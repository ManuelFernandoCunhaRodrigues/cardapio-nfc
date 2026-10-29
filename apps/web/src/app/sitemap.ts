import type { MetadataRoute } from 'next';

import { getSiteEnv, getSiteUrl } from '@/lib/env';
import { getPublicSitemapProducts } from '@/features/menu/server/get-public-menu';
import { getPublicSitemap } from '@/lib/seo/sitemap';

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const siteEnv = getSiteEnv();
  if (siteEnv !== 'production' || !siteUrl) return [];

  const products = await getPublicSitemapProducts();
  return getPublicSitemap(siteEnv, siteUrl, products.data ?? []);
}
