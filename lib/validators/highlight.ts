import { z } from 'zod';

const optionalText = z.string().trim().max(600, 'Use no máximo 600 caracteres.').transform((value) => value || null);

function isSafeHighlightTarget(value: string | null): boolean {
  if (value === null) return true;
  if (value.startsWith('/')) return !value.startsWith('//') && !value.includes('\\');
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export const highlightFormSchema = z.object({
  title: z.string().trim().min(2, 'Informe o título do destaque.').max(120, 'Use no máximo 120 caracteres.'),
  description: optionalText,
  target: z.string().trim().max(2048, 'O destino é longo demais.').transform((value) => value || null).refine(isSafeHighlightTarget, 'Escolha um destino do painel ou informe um endereço começando com http:// ou https://.'),
  is_active: z.boolean(),
});

export type HighlightFormValues = z.infer<typeof highlightFormSchema>;
