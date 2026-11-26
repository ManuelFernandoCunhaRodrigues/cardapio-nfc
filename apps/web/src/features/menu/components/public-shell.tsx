import type { ReactNode } from 'react';

import { MotionProvider } from '@/components/motion/motion-provider';

import { PublicNav } from './public-nav';

/** Moldura do site público (largura de celular, barra inferior e foco forte), também na 404. */
export function PublicShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="public-shell mx-auto min-h-screen max-w-[480px] bg-cream pb-[calc(4.5rem+env(safe-area-inset-bottom))] shadow-[0_0_40px_rgba(23,17,13,0.08)]">
      <MotionProvider>
        {children}
        <PublicNav />
      </MotionProvider>
    </div>
  );
}
