import { revalidatePath } from 'next/cache';

/** O painel lê sem cache; isto só faz o Next renderizar de novo as telas depois de salvar. */
export function refreshAdminPanel(): void {
  revalidatePath('/admin', 'layout');
}
