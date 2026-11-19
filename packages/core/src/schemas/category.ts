import { z } from 'zod';

import { slugSchema } from './slug';

const nullableText = z
  .string()
  .trim()
  .max(500)
  .transform((value) => value || null);

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Informe o nome da categoria.')
    .max(80, 'Use no máximo 80 caracteres.'),
  slug: slugSchema,
  description: nullableText,
  is_active: z.boolean(),
});
