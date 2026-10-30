import type { MetadataRoute } from 'next';

import { getSiteEnv, getSiteUrl } from '@/lib/env';
import { getPublicSitemap as getPublicSitemapItems } from '@/lib/api/public-api-client';
import { getPublicSitemap } from '@/lib/seo/sitemap';

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const siteEnv = getSiteEnv();
  if (siteEnv !== 'production' || !siteUrl) return [];

  const products = await getPublicSitemapItems();
  return getPublicSitemap(siteEnv, siteUrl, products);
}
