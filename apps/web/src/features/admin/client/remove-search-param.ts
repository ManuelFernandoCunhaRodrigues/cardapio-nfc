/**
 * Tira um parâmetro da URL atual sem navegar (ex.: `?nova` que abriu a gaveta pelo atalho),
 * para que recarregar a página não reabra o editor já fechado.
 */
export function removeSearchParam(name: string): void {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState(null, '', `${url.pathname}${url.search}`);
}
