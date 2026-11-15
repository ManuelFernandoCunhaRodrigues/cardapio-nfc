import { revalidatePath } from 'next/cache';

/** Telas de lista do painel, pelo endereço (o grupo `(painel)` não entra no caminho). */
const adminListPaths = {
  products: '/admin/produtos',
  categories: '/admin/categorias',
  highlights: '/admin/destaques',
} as const;

/** O painel lê sem cache; isto só faz o Next renderizar de novo as telas depois de salvar. */
export function refreshAdminPanel(): void {
  revalidatePath('/admin', 'layout');
}

/**
 * Para mudanças que só a lista mostra, como a ordem: marca apenas a tela da lista, em vez de todo
 * o painel abaixo do layout.
 */
export function refreshAdminList(list: keyof typeof adminListPaths): void {
  revalidatePath(adminListPaths[list]);
}
