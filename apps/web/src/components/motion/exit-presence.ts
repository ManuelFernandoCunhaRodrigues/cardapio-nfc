// Dentro do `AnimatePresence`, o que está saindo continua no DOM até a animação acabar; uma
// camada coberta por outra (confirmação sobre a gaveta) também continua lá. Nos dois casos ela
// fica inerte e fora da árvore de acessibilidade: nunca há dois `role=dialog` acessíveis nem
// clique ou foco numa camada que não é a de cima.
export function layerAttributes(isActive: boolean) {
  return isActive ? {} : ({ inert: true, 'aria-hidden': true } as const);
}

export const overlayFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
} as const;
