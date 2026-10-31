import { z } from 'zod';

import { storeSettingsSchema } from '../schemas/store-settings';

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

export const activationInputSchema = z.object({ is_active: z.boolean() });
export const reorderInputSchema = z.object({ direction: z.enum(['up', 'down']) });
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

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type FieldErrors = NonNullable<ApiErrorResponse['fieldErrors']>;
export type AdminSessionResponse = z.infer<typeof adminSessionResponseSchema>;
export type CreatedResponse = z.infer<typeof createdResponseSchema>;
export type ActivationInput = z.infer<typeof activationInputSchema>;
export type ReorderInput = z.infer<typeof reorderInputSchema>;
export type StoreStatusInput = z.infer<typeof storeStatusInputSchema>;
export type AdminCategory = z.infer<typeof adminCategorySchema>;
export type AdminHighlight = z.infer<typeof adminHighlightSchema>;
