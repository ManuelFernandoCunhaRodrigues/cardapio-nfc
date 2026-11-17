import type { z } from 'zod';

import {
  adminApiPaths,
  adminCategorySchema,
  adminHighlightSchema,
  adminProductSchema,
  type AdminCategory,
  type AdminHighlight,
  type AdminProduct,
} from '@salgae/core/contracts/admin-api';

import { redirectIfSessionExpiredForRequest } from '@/features/admin/server/session-redirect';
import { adminApi } from '@/lib/api/admin-api-client';
export type { AdminProduct } from '@salgae/core/contracts/admin-api';

async function readPanelData<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  try {
    return await adminApi().read(path, schema);
  } catch (error) {
    await redirectIfSessionExpiredForRequest(error);
    throw error;
  }
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  return readPanelData(adminApiPaths.categories, adminCategorySchema.array());
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  return readPanelData(adminApiPaths.products, adminProductSchema.array());
}

export async function getAdminHighlights(): Promise<AdminHighlight[]> {
  return readPanelData(adminApiPaths.highlights, adminHighlightSchema.array());
}
