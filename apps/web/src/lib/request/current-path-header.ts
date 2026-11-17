/**
 * Cabeçalho interno com a tela pedida (caminho + busca). Só o `proxy` escreve: ele sobrescreve
 * qualquer valor que venha do navegador, e quem lê ainda valida o caminho antes de usar.
 */
export const CURRENT_PATH_HEADER = 'x-salgae-current-path';

/**
 * Cabeçalho interno que diz se o pedido chegou com cookie de sessão do Supabase. Só o `proxy`
 * escreve, sempre sobrescrevendo, antes de renovar ou limpar a sessão. Sem cookie, a pessoa nunca
 * entrou: o login não fala em sessão expirada.
 */
export const HAD_SESSION_HEADER = 'x-salgae-had-session';

const SUPABASE_AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export function hasSupabaseSessionCookie(cookieNames: readonly string[]): boolean {
  return cookieNames.some((name) => SUPABASE_AUTH_COOKIE.test(name));
}
