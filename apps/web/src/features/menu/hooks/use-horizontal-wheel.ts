'use client';

import { useEffect, type RefObject } from 'react';

import { getHorizontalWheelDelta } from '@/features/menu/rules/horizontal-wheel';
import { useMediaQuery } from '@/hooks/use-client-snapshot';

/**
 * No computador, a roda do mouse rola a faixa para o lado (a barra fica escondida e não há setas).
 * O toque não gera evento de roda, então no celular nada muda.
 */
export function useHorizontalWheel(trackRef: RefObject<HTMLElement | null>) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const handleWheel = (event: WheelEvent) => {
      const delta = getHorizontalWheelDelta(event, track);
      if (delta === null) return;
      event.preventDefault();
      // `scrollBy` respeita o encaixe dos cards: anda até o próximo na direção da roda.
      track.scrollBy({ left: delta, behavior: reducedMotion ? 'auto' : 'smooth' });
    };
    // Não passivo: é preciso cancelar a rolagem da página enquanto a faixa anda.
    track.addEventListener('wheel', handleWheel, { passive: false });
    return () => track.removeEventListener('wheel', handleWheel);
  }, [trackRef, reducedMotion]);
}
