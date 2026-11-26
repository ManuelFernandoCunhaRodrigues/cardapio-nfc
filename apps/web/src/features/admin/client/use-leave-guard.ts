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

/** Parte da Navigation API usada aqui; os tipos do TypeScript ainda não a trazem em todo projeto. */
type TraverseAwareNavigation = EventTarget & {
  addEventListener(type: 'navigate', listener: (event: NavigateLikeEvent) => void): void;
  removeEventListener(type: 'navigate', listener: (event: NavigateLikeEvent) => void): void;
};
type NavigateLikeEvent = Event & { navigationType: string; cancelable: boolean };

function browserNavigation(): TraverseAwareNavigation | null {
  return (window as Window & { navigation?: TraverseAwareNavigation }).navigation ?? null;
}

/**
 * Pede confirmação antes de descartar um formulário alterado. Os links do Next trocam de tela sem
 * recarregar a página e por isso não disparam `beforeunload`: sem a escuta de cliques, o menu do
 * painel jogava as alterações fora sem avisar. A fase de captura roda antes do clique chegar ao
 * React, o que permite cancelar a navegação do `Link`.
 *
 * Voltar pelo navegador ou pelo gesto do celular não passa por clique nem por `beforeunload`: a
 * Navigation API avisa antes (`navigate` do tipo `traverse`) e deixa cancelar. Navegações feitas
 * pelo código (`router.replace` depois de criar, login por sessão vencida) são `push`/`replace` e
 * passam direto.
 */
export function useLeaveGuard(active: boolean, message = LEAVE_MESSAGE): void {
  useEffect(() => {
    if (!active) return;
    const confirmClick = (event: MouseEvent) => {
      if (!isInternalNavigation(event) || window.confirm(message)) return;
      event.preventDefault();
      event.stopPropagation();
    };
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const confirmTraverse = (event: NavigateLikeEvent) => {
      if (event.navigationType !== 'traverse' || !event.cancelable) return;
      if (!window.confirm(message)) event.preventDefault();
    };
    const navigation = browserNavigation();
    document.addEventListener('click', confirmClick, { capture: true });
    window.addEventListener('beforeunload', warnBeforeUnload);
    navigation?.addEventListener('navigate', confirmTraverse);
    return () => {
      document.removeEventListener('click', confirmClick, { capture: true });
      window.removeEventListener('beforeunload', warnBeforeUnload);
      navigation?.removeEventListener('navigate', confirmTraverse);
    };
  }, [active, message]);
}
