'use client';

import { type HTMLMotionProps, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { useEffect, useState } from 'react';

export const gentleSpring = { type: 'spring', stiffness: 360, damping: 32 } as const;

export const resultPresence = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.18 },
} as const;

type MenuCardStaggerProps = HTMLMotionProps<'div'> & {
  sequence: number;
};

export function MenuCardStagger({ sequence, children, ...props }: Readonly<MenuCardStaggerProps>) {
  const [animationPhase, setAnimationPhase] = useState<'visible' | 'prepared' | 'entered'>(
    'visible',
  );
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const visitedKey = 'salgae:menu-card-motion-played';
    if (reducedMotion || sessionStorage.getItem(visitedKey)) return;
    sessionStorage.setItem(visitedKey, 'true');
    let enterFrame = 0;
    const prepareFrame = requestAnimationFrame(() => {
      setAnimationPhase('prepared');
      enterFrame = requestAnimationFrame(() => setAnimationPhase('entered'));
    });
    return () => {
      cancelAnimationFrame(prepareFrame);
      cancelAnimationFrame(enterFrame);
    };
  }, [reducedMotion]);

  const animatedStyle =
    animationPhase === 'prepared' ? { opacity: 0.94, y: 8 } : { opacity: 1, y: 0 };

  return (
    <m.div
      {...props}
      animate={animationPhase === 'visible' ? undefined : animatedStyle}
      initial={false}
      transition={{ duration: 0.24, delay: sequence * 0.045 }}
    >
      {children}
    </m.div>
  );
}
