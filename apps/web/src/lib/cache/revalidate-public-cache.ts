import { revalidateTag } from 'next/cache';

import { cacheTags } from './cache-tags';

export function revalidateMenuCache(productId?: string): void {
  revalidateTag(cacheTags.menu, { expire: 0 });
  if (productId) revalidateTag(cacheTags.product(productId), { expire: 0 });
}
