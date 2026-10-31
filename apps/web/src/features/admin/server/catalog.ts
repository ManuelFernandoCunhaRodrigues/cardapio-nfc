import {
  adminApiPaths,
  adminCategorySchema,
  adminHighlightSchema,
  adminProductSchema,
  type AdminCategory,
  type AdminHighlight,
  type AdminProduct,
} from '@salgae/core/contracts/admin-api';

import { adminApi } from '@/lib/api/admin-api-client';
export type { AdminProduct } from '@salgae/core/contracts/admin-api';

export async function getAdminCategories(): Promise<AdminCategory[]> {
  return adminApi().read(adminApiPaths.categories, adminCategorySchema.array());
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  return adminApi().read(adminApiPaths.products, adminProductSchema.array());
}

export async function getAdminHighlights(): Promise<AdminHighlight[]> {
  return adminApi().read(adminApiPaths.highlights, adminHighlightSchema.array());
}
