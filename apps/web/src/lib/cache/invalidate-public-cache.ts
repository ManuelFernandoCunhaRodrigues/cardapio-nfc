import { updateTag } from 'next/cache';

import { cacheTags } from './cache-tags';

export function invalidateMenuCache(productSlugOrId?: string): void {
  updateTag(cacheTags.menu);
  if (productSlugOrId) updateTag(cacheTags.product(productSlugOrId));
}

export function invalidateStoreCache(): void {
  updateTag(cacheTags.store);
}
