const PANEL_HOME = '/admin';
const LOGIN_PATH = '/admin/login';
const PARSE_BASE = 'https://painel.invalid';
/** Parâmetro interno do roteador do Next em pedidos de navegação; não faz parte da tela. */
const ROUTER_PARAMS = ['_rsc'];
// Barra invertida e caracteres de controle mudam o sentido do endereço em alguns navegadores.
function hasUnsafeCharacter(value: string): boolean {
  return [...value].some((char) => {
    const code = char.charCodeAt(0);
    return char === '\\' || code < 0x20 || code === 0x7f;
  });
}

function isPanelPath(pathname: string): boolean {
  return pathname === PANEL_HOME || pathname.startsWith(`${PANEL_HOME}/`);
}

// O roteador decodifica o caminho e ignora a barra final: `/admin/login/` e `/admin/%6Cogin` também
// são o login.
function isLoginPath(pathname: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname).toLowerCase();
  } catch {
    return true;
  }
  return decoded === LOGIN_PATH || decoded.startsWith(`${LOGIN_PATH}/`);
}

/**
 * Aceita só telas do próprio painel (`/admin` e abaixo), nunca o login nem outro site. Qualquer
 * outra coisa (endereço absoluto, `//site`, `/\site`, fora de `/admin`) volta para o início.
 */
export function safeAdminReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || hasUnsafeCharacter(value)) {
    return PANEL_HOME;
  }
  let url: URL;
  try {
    url = new URL(value, PARSE_BASE);
  } catch {
    return PANEL_HOME;
  }
  if (url.origin !== PARSE_BASE || !isPanelPath(url.pathname) || isLoginPath(url.pathname)) {
    return PANEL_HOME;
  }
  ROUTER_PARAMS.forEach((name) => url.searchParams.delete(name));
  return `${url.pathname}${url.search}`;
}

/**
 * Login para quem abriu uma tela do painel sem sessão válida: o motivo faz o login explicar que a
 * sessão expirou, e `voltar` leva de novo à tela depois de entrar (omitido quando é o início).
 */
export function sessionExpiredLoginPath(returnTo?: string | null): string {
  const query = new URLSearchParams({ motivo: 'sessao' });
  const safeReturn = safeAdminReturnPath(returnTo);
  if (safeReturn !== PANEL_HOME) query.set('voltar', safeReturn);
  return `${LOGIN_PATH}?${query}`;
}
