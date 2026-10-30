import { revalidatePath } from 'next/cache';
import type { z } from 'zod';

import { invalidateMenuCache } from '@/lib/cache/invalidate-public-cache';

type ActionStateWithFieldErrors = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type FormErrorState<TState extends ActionStateWithFieldErrors> = Pick<
  TState,
  'status' | 'message' | 'fieldErrors'
>;

type CatalogArea = 'categorias' | 'destaques' | 'produtos';

export function formError<TState extends ActionStateWithFieldErrors>(
  error: z.ZodError,
): FormErrorState<TState> {
  const fieldErrors = error.issues.reduce<Record<string, string[]>>((result, issue) => {
    const field = issue.path.join('.');
    if (field) result[field] = [...(result[field] ?? []), issue.message];
    return result;
  }, {});

  return {
    status: 'error',
    message: 'Revise os campos destacados antes de salvar.',
    fieldErrors,
  };
}

export function revalidateCatalog(areas: readonly CatalogArea[], productId?: string): void {
  invalidateMenuCache(productId);
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  areas.forEach((area) => revalidatePath(`/admin/${area}`));
  if (productId) revalidatePath(`/admin/produtos/${productId}`);
}
