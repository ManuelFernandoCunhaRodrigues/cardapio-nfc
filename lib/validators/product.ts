import { z } from 'zod';

export const productSchema = z
  .object({
    id: z.string().uuid(),
    category_id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    price_cents: z.number().int().nonnegative(),
    image_path: z.string().nullable(),
    video_path: z.string().trim().min(1).nullable().optional(),
    sort_order: z.number().int(),
    is_active: z.boolean(),
    is_available: z.boolean(),
  })
  .refine((product) => product.video_path == null || product.image_path != null, {
    message: 'Um vídeo exige uma imagem de capa.',
    path: ['video_path'],
  });

export type Product = z.infer<typeof productSchema>;
