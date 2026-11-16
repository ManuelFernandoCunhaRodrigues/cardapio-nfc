export const gentleSpring = { type: 'spring', stiffness: 360, damping: 32 } as const;

// Itens de lista que trocam de posição (Subir/Descer no painel) deslizam até o lugar novo.
export const listReorder = { layout: 'position', transition: gentleSpring } as const;

export const resultPresence = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18 },
} as const;
