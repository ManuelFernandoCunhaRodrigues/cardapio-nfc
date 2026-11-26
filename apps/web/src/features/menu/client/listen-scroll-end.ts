/** Tempo sem eventos de rolagem que conta como fim da rolagem onde `scrollend` não existe. */
export const SCROLL_IDLE_MS = 150;

/** Chama `onScrollEnd` quando a rolagem para; devolve a função que desliga a escuta. */
export function listenScrollEnd(target: EventTarget, onScrollEnd: () => void): () => void {
  if ('onscrollend' in target) {
    target.addEventListener('scrollend', onScrollEnd);
    return () => target.removeEventListener('scrollend', onScrollEnd);
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const waitForIdle = () => {
    clearTimeout(timer);
    timer = setTimeout(onScrollEnd, SCROLL_IDLE_MS);
  };
  target.addEventListener('scroll', waitForIdle, { passive: true });
  return () => {
    clearTimeout(timer);
    target.removeEventListener('scroll', waitForIdle);
  };
}
