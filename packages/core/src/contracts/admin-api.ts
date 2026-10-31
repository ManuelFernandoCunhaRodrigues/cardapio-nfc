import { z } from 'zod';

import { storeSettingsSchema } from '../schemas/store-settings';
import { productFormSchema } from '../schemas/product';

const adminRoot = '/v1/admin';

export const adminApiPaths = {
  session: `${adminRoot}/session`,
  store: `${adminRoot}/store`,
  storeStatus: `${adminRoot}/store/status`,
  categories: `${adminRoot}/categories`,
  category: (id: string) => `${adminRoot}/categories/${encodeURIComponent(id)}`,
  categoryActivation: (id: string) => `${adminRoot}/categories/${encodeURIComponent(id)}/active`,
  categoryOrder: (id: string) => `${adminRoot}/categories/${encodeURIComponent(id)}/order`,
  highlights: `${adminRoot}/highlights`,
  highlight: (id: string) => `${adminRoot}/highlights/${encodeURIComponent(id)}`,
  highlightActivation: (id: string) => `${adminRoot}/highlights/${encodeURIComponent(id)}/active`,
  highlightOrder: (id: string) => `${adminRoot}/highlights/${encodeURIComponent(id)}/order`,
  highlightImage: (id: string) => `${adminRoot}/highlights/${encodeURIComponent(id)}/image`,
  products: `${adminRoot}/products`,
  product: (id: string) => `${adminRoot}/products/${encodeURIComponent(id)}`,
  productSituation: (id: string) => `${adminRoot}/products/${encodeURIComponent(id)}/situation`,
  productOrder: (id: string) => `${adminRoot}/products/${encodeURIComponent(id)}/order`,
  productImage: (id: string) => `${adminRoot}/products/${encodeURIComponent(id)}/image`,
} as const;

export const apiErrorResponseSchema = z.object({
  status: z.literal('error'),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});

export const adminSessionResponseSchema = z.object({
  userId: z.string(),
  email: z.string().nullable(),
  name: z.string().nullable(),
  role: z.literal('admin'),
});

export const createdResponseSchema = z.object({ id: z.string().uuid() });
export const imageResponseSchema = z.object({ path: z.string().min(1) });

export const activationInputSchema = z.object({ is_active: z.boolean() });
export const reorderInputSchema = z.object({ direction: z.enum(['up', 'down']) });
export const productSituationInputSchema = z.object({
  situation: z.enum(['menu', 'unavailable', 'hidden']),
});
export const storeStatusInputSchema = z.object({
  status_override: z.enum(['auto', 'open', 'closed'], 'Escolha um estado válido para a loja.'),
});

export const adminStoreResponseSchema = storeSettingsSchema;

export const adminCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  image_path: z.string().nullable(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
  product_count: z.number().int().nonnegative(),
});

export const adminHighlightSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  image_path: z.string().nullable(),
  target: z.string().nullable(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
});

export const adminProductSchema = z.object({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  price_cents: z.number().int().nonnegative(),
  image_path: z.string().nullable(),
  video_path: z.string().nullable(),
  badge: z.enum(['mais_pedido', 'novo', 'quentinho']).nullable(),
  sort_order: z.number().int(),
  is_active: z.boolean(),
  is_available: z.boolean(),
  category: z.object({ name: z.string(), slug: z.string() }).nullable(),
});

/** Entrada do formulário de produto; o preço chega como texto e o service o converte. */
export const productInputSchema = productFormSchema.extend({
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens.')
    .optional(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type FieldErrors = NonNullable<ApiErrorResponse['fieldErrors']>;
export type AdminSessionResponse = z.infer<typeof adminSessionResponseSchema>;
export type CreatedResponse = z.infer<typeof createdResponseSchema>;
export type ActivationInput = z.infer<typeof activationInputSchema>;
export type ReorderInput = z.infer<typeof reorderInputSchema>;
export type ProductSituationInput = z.infer<typeof productSituationInputSchema>;
export type StoreStatusInput = z.infer<typeof storeStatusInputSchema>;
export type AdminCategory = z.infer<typeof adminCategorySchema>;
export type AdminHighlight = z.infer<typeof adminHighlightSchema>;
export type AdminProduct = z.infer<typeof adminProductSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
