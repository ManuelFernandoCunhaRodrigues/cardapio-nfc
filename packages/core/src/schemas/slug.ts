import { z } from 'zod';

export const slugSchema = z
  .string()
  .trim()
  .min(2, 'Informe um identificador.')
  .max(80, 'Use no máximo 80 caracteres.')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens.');
