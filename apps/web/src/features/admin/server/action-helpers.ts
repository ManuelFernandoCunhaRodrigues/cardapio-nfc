import { revalidatePath } from 'next/cache';

import { invalidateMenuCache } from '@/lib/cache/invalidate-public-cache';

type CatalogArea = 'categorias' | 'destaques' | 'produtos';

export function revalidateCatalog(areas: readonly CatalogArea[], productId?: string): void {
  invalidateMenuCache(productId);
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  areas.forEach((area) => revalidatePath(`/admin/${area}`));
  if (productId) revalidatePath(`/admin/produtos/${productId}`);
}
