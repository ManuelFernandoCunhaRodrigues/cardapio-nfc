import { z } from 'zod';

const nullableDescription = z
  .string()
  .trim()
  .max(600, 'Use no máximo 600 caracteres.')
  .transform((value) => value || null);

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe o nome do produto.')
    .max(120, 'Use no máximo 120 caracteres.'),
  description: nullableDescription,
  price: z.string().trim().min(1, 'Informe o preço.'),
  category_id: z.string().uuid('Escolha uma categoria válida.'),
  badge: z.enum(['mais_pedido', 'novo', 'quentinho']).nullable(),
  is_active: z.boolean(),
  is_available: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const productSchema = z
  .object({
    id: z.string().uuid(),
    category_id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    price_cents: z.number().int().nonnegative(),
    image_path: z.string().nullable(),
    video_path: z.string().trim().min(1).nullable().optional(),
    badge: z
      .enum(['mais_pedido', 'novo', 'quentinho'])
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    sort_order: z.number().int(),
    is_active: z.boolean(),
    is_available: z.boolean(),
  })
  .refine((product) => product.video_path == null || product.image_path != null, {
    message: 'Um vídeo exige uma imagem de capa.',
    path: ['video_path'],
  });

export type Product = z.infer<typeof productSchema>;
