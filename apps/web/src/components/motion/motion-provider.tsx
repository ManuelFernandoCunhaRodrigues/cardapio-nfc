'use client';

import { LazyMotion, MotionConfig, domMax } from 'motion/react';
import type { ReactNode } from 'react';

// EXPERIMENTO (não mesclar): recursos carregados de uma vez, sem atualizar o contexto depois da hidratação.
export function MotionProvider({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
