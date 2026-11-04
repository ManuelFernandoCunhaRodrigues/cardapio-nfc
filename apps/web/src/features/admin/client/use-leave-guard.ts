'use client';

import { useEffect } from 'react';

const LEAVE_MESSAGE = 'Sair sem salvar as alterações?';

function isInternalNavigation(event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.download) {
    return false;
  }
  const url = new URL(link.href);
  const current = window.location;
  return (
    url.origin === current.origin &&
    (url.pathname !== current.pathname || url.search !== current.search)
  );
}

/**
 * Pede confirmação antes de descartar um formulário alterado. Os links do Next trocam de tela sem
 * recarregar a página e por isso não disparam `beforeunload`: sem a escuta de cliques, o menu do
 * painel jogava as alterações fora sem avisar. A fase de captura roda antes do clique chegar ao
 * React, o que permite cancelar a navegação do `Link`.
 */
export function useLeaveGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const confirmClick = (event: MouseEvent) => {
      if (!isInternalNavigation(event) || window.confirm(LEAVE_MESSAGE)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    document.addEventListener('click', confirmClick, { capture: true });
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => {
      document.removeEventListener('click', confirmClick, { capture: true });
      window.removeEventListener('beforeunload', warnBeforeUnload);
    };
  }, [active]);
}
