import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { sessionExpiredLoginPath } from '@/features/admin/rules/session-return';
import { ApiRequestError } from '@/lib/api/api-request-error';
import { CURRENT_PATH_HEADER, HAD_SESSION_HEADER } from '@/lib/request/current-path-header';

/**
 * Login com o motivo e a volta para a tela atual, gravada pelo `proxy` num cabeçalho interno (a
 * regra valida o valor antes de usar).
 *
 * Layout, leituras e Server Actions usam este mesmo endereço. Como o layout e a página rodam em
 * paralelo, um texto diferente para cada um deixaria o destino depender de quem respondeu antes.
 */
export async function loginPathForCurrentScreen(): Promise<string> {
  const requestHeaders = await headers();
  return sessionExpiredLoginPath(
    requestHeaders.get(CURRENT_PATH_HEADER),
    requestHeaders.get(HAD_SESSION_HEADER) !== '0',
  );
}

function isSessionExpired(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401;
}

/**
 * O layout do painel confere o login, mas não roda de novo ao trocar de tela. Sem isto, a página
 * aberta com a sessão vencida caía na tela genérica de erro em vez de voltar ao login.
 */
export async function redirectIfSessionExpiredForRequest(error: unknown): Promise<void> {
  if (isSessionExpired(error)) redirect(await loginPathForCurrentScreen());
}

/**
 * Versão síncrona para quem não pode esperar a leitura dos cabeçalhos: explica o motivo, mas volta
 * para o início do painel. Prefira `redirectIfSessionExpiredForRequest`.
 */
export function redirectIfSessionExpired(error: unknown): void {
  if (isSessionExpired(error)) redirect(sessionExpiredLoginPath(null));
}
