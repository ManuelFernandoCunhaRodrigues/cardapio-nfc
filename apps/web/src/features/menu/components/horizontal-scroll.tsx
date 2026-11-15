'use client';

import { useRef, type ComponentPropsWithoutRef } from 'react';

import { useHorizontalWheel } from '@/features/menu/hooks/use-horizontal-wheel';

type HorizontalScrollProps = ComponentPropsWithoutRef<'div'> & { as?: 'div' | 'nav' };

/** Faixa com rolagem lateral que também anda com a roda do mouse. */
export function HorizontalScroll({ as: Element = 'div', ...props }: HorizontalScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  useHorizontalWheel(ref);
  return <Element {...props} ref={ref} />;
}
