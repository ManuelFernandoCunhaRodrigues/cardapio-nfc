import { z } from 'zod';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_PATTERN_MESSAGE = 'Use letras minúsculas, números e hífens.';

/**
 * Formato do slug, sem limite de tamanho: o banco gera o slug do produto a partir de nomes de até
 * 120 caracteres, mais o sufixo de unicidade, e a edição do produto devolve esse mesmo valor.
 */
export const slugSchema = z.string().trim().regex(SLUG_PATTERN, SLUG_PATTERN_MESSAGE);

/** Slug da categoria, digitado no painel: tamanho limitado. */
export const slugInputSchema = z
  .string()
  .trim()
  .min(2, 'Informe um identificador.')
  .max(80, 'Use no máximo 80 caracteres.')
  .regex(SLUG_PATTERN, SLUG_PATTERN_MESSAGE);
