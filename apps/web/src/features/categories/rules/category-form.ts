import { slugifyPtBr } from '@salgae/core/rules/slug';

type FieldErrors = Record<string, string[] | undefined> | undefined;

const SLUG_TAKEN = 'Esse endereço curto já está em uso.';

/**
 * O endereço da categoria no cardápio (/cardapio#bebidas) nasce do nome e não muda depois:
 * renomear não quebra links nem destaques que apontam para ela.
 */
export function categorySlugFor(name: string, storedSlug: string | null): string {
  return storedSlug ?? slugifyPtBr(name);
}

/** O dono não vê o endereço curto: o erro dele aparece no campo Nome, em palavras simples. */
export function categoryNameError(fieldErrors: FieldErrors): string | undefined {
  const nameError = fieldErrors?.name?.[0];
  if (nameError) return nameError;
  const slugError = fieldErrors?.slug?.[0];
  if (!slugError) return undefined;
  return slugError === SLUG_TAKEN
    ? 'Já existe uma categoria com um nome parecido. Use outro nome.'
    : 'Use um nome com pelo menos duas letras ou números.';
}

/** Com o erro já explicado no Nome, o aviso geral sobre "endereço curto" só confundiria. */
export function categoryFormMessage(state: {
  status: string;
  message?: string;
  fieldErrors?: FieldErrors;
}): string | undefined {
  if (state.status !== 'error' || state.fieldErrors?.slug) return undefined;
  return state.message;
}
