import type { MetadataRoute } from 'next';

import { getSiteEnv, getSiteUrl } from '@/lib/env';
import { getRobotsDisallow } from '@/lib/seo/robots';

export default function robots(): MetadataRoute.Robots {
  const siteEnv = getSiteEnv();
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: '*',
      disallow: getRobotsDisallow(siteEnv),
    },
    ...(siteEnv === 'production' && siteUrl
      ? { sitemap: new URL('/sitemap.xml', siteUrl).toString() }
      : {}),
  };
}
