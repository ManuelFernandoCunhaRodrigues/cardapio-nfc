import type { MetadataRoute } from 'next';

import { getSiteEnv } from '@/lib/env';
import { getRobotsDisallow } from '@/lib/seo/robots';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: getRobotsDisallow(getSiteEnv()),
    },
  };
}
