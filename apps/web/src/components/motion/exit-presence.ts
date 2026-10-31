'use client';

import { useIsPresent } from 'motion/react';

// Dentro do `AnimatePresence`, o que está saindo continua no DOM até a animação acabar. Ele fica
// inerte e fora da árvore de acessibilidade para não haver dois `role=dialog` (ou dois avisos)
// ao mesmo tempo nem clique ou foco preso numa camada que já está sumindo.
export function useExitPresence() {
  const isPresent = useIsPresent();
  const exitingAttributes = isPresent ? {} : ({ inert: true, 'aria-hidden': true } as const);
  return { isPresent, exitingAttributes };
}

export const overlayFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
} as const;
