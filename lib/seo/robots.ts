import type { SiteEnv } from '@/lib/env';

export function getRobotsDisallow(siteEnv: SiteEnv): string[] {
  return siteEnv === 'production' ? ['/admin'] : ['/'];
}
