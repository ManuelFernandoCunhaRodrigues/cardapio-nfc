import { z } from 'zod';

import { productSchema } from '../schemas/product';
import { storeSettingsSchema } from '../schemas/store-settings';

export const publicApiPaths = {
  menu: '/v1/menu',
  product: (slugOrId: string) => `/v1/menu/products/${encodeURIComponent(slugOrId)}`,
  sitemap: '/v1/menu/sitemap',
  store: '/v1/store',
} as const;

export const menuCategorySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  image_path: z.string().nullable(),
  sort_order: z.number().int(),
});

export const menuHighlightSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  image_path: z.string().nullable(),
  target: z.string().nullable(),
  sort_order: z.number().int(),
});

export const publicMenuResponseSchema = z.object({
  categories: z.array(menuCategorySchema),
  products: z.array(productSchema),
  highlights: z.array(menuHighlightSchema),
});

export const productCategorySchema = menuCategorySchema.pick({ name: true, slug: true });

export const publicProductResponseSchema = z.object({
  product: productSchema,
  category: productCategorySchema,
  relatedProducts: z.array(productSchema),
});

export const sitemapItemSchema = z.object({
  slug: z.string(),
  updated_at: z.string(),
});

export const publicSitemapResponseSchema = z.array(sitemapItemSchema);
export const publicStoreResponseSchema = storeSettingsSchema;

export type MenuCategory = z.infer<typeof menuCategorySchema>;
export type MenuHighlight = z.infer<typeof menuHighlightSchema>;
export type PublicMenuResponse = z.infer<typeof publicMenuResponseSchema>;
export type PublicProductResponse = z.infer<typeof publicProductResponseSchema>;
export type PublicSitemapItem = z.infer<typeof sitemapItemSchema>;
export type PublicStoreResponse = z.infer<typeof publicStoreResponseSchema>;
