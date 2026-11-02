'use client';

import { type HTMLMotionProps, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { createContext, use, useEffect, useState, type ReactNode } from 'react';

export const gentleSpring = { type: 'spring', stiffness: 360, damping: 32 } as const;

// Itens de lista que trocam de posição (Subir/Descer no painel) deslizam até o lugar novo.
export const listReorder = { layout: 'position', transition: gentleSpring } as const;

export const resultPresence = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18 },
} as const;

const MENU_ENTRANCE_KEY = 'salgae:menu-card-motion-played';
// A cascata para depois de alguns cards: os de baixo não esperam segundos para assentar.
const MAX_STAGGERED_CARDS = 6;

// Quadros-chave numa animação só: recuar e assentar em dois passos podia deixar o card parado
// em y: 8 quando o segundo passo chegava antes do primeiro ser aplicado.
const cardEntrance = { opacity: [0.94, 1], y: [8, 0] };

const MenuEntranceContext = createContext(false);

// Decide uma vez por página se a entrada roda (só na primeira visita da sessão e sem movimento
// reduzido). Os cards começam visíveis no HTML do servidor e só depois da hidratação recuam um
// pouco para entrar, então nada nasce invisível nem atrasa o LCP.
export function MenuEntrance({ children }: Readonly<{ children: ReactNode }>) {
  const [entering, setEntering] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion || sessionStorage.getItem(MENU_ENTRANCE_KEY)) return;
    sessionStorage.setItem(MENU_ENTRANCE_KEY, 'true');
    const frame = requestAnimationFrame(() => setEntering(true));
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion]);

  return <MenuEntranceContext value={entering}>{children}</MenuEntranceContext>;
}

type MenuCardStaggerProps = HTMLMotionProps<'div'> & {
  sequence: number;
};

export function MenuCardStagger({ sequence, children, ...props }: Readonly<MenuCardStaggerProps>) {
  const entering = use(MenuEntranceContext);

  return (
    <m.div
      {...props}
      animate={entering ? cardEntrance : undefined}
      initial={false}
      transition={{ duration: 0.24, delay: Math.min(sequence, MAX_STAGGERED_CARDS) * 0.045 }}
    >
      {children}
    </m.div>
  );
}
