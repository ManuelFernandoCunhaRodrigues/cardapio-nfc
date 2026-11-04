import { redirect } from 'next/navigation';

import { ApiRequestError } from '@/lib/api/api-request-error';

/**
 * O layout do painel confere o login, mas não roda de novo ao trocar de tela. Sem isto, a página
 * aberta com a sessão vencida caía na tela genérica de erro em vez de voltar ao login.
 */
export function redirectIfSessionExpired(error: unknown): void {
  if (error instanceof ApiRequestError && error.status === 401) redirect('/admin/login');
}
