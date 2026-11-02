import { z } from 'zod';

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
  slug: z
    .string()
    .trim()
    .min(2, 'Informe um identificador para a categoria.')
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens.'),
  description: nullableText,
  is_active: z.boolean(),
});
