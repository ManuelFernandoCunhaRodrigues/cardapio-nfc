'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import * as m from 'motion/react-m';

import {
  getClosestHighlightIndex,
  getRelativeSlideOffsets,
  HighlightCarouselController,
  previousHighlightIndex,
} from '@/features/menu/rules/highlight-carousel';
import type { MenuHighlight } from '@/features/menu/types';
import { useHighlightDrag } from '@/features/menu/hooks/use-highlight-drag';
import { useHydrated, useMediaQuery } from '@/hooks/use-client-snapshot';

import { HighlightSlide } from './highlight-slide';
import { Icon } from './icons';

// Acima disso os pontos não cabem na largura do banner e dão lugar a um contador.
const MAX_DOTS = 6;

const fallback: MenuHighlight = {
  id: 'default',
  title: 'Salgados quentinhos',
  description: 'Feitos com carinho para matar a fome.',
  image_path: null,
  target: '/cardapio',
  sort_order: 0,
};

export function HighlightBanner({ highlights }: Readonly<{ highlights: MenuHighlight[] }>) {
  const items = highlights.length ? highlights : [fallback];
  const itemCount = items.length;
  const interactive = itemCount > 1;
  const [active, setActive] = useState(0);
  const enhanced = useHydrated();
  const [announcement, setAnnouncement] = useState('');
  // Pausa pedida pelo botão: só volta quando a pessoa toca de novo (WCAG 2.2.2).
  const [pausedByUser, setPausedByUser] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const trackRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HighlightCarouselController | null>(null);
  const programmedScrollRef = useRef<{ index: number; offset: number } | null>(null);
  const drag = useHighlightDrag({
    activeIndex: active,
    itemCount: items.length,
    onSelect: goTo,
  });

  function getSlideOffsets(track: HTMLDivElement) {
    return getRelativeSlideOffsets(
      track.offsetLeft,
      Array.from(track.children, (child) => (child as HTMLElement).offsetLeft),
    );
  }

  function scrollTo(index: number, source: 'automatic' | 'manual' = 'automatic') {
    const track = trackRef.current;
    if (!track) return;
    const offset = getSlideOffsets(track)[index] ?? 0;
    programmedScrollRef.current =
      Math.abs(track.scrollLeft - offset) > 1 ? { index, offset } : null;
    setActive(index);
    track.scrollTo({ left: offset, behavior: reducedMotion ? 'auto' : 'smooth' });
    if (source === 'manual') setAnnouncement(`Destaque ${index + 1} de ${items.length}`);
  }

  // Sempre com o `scrollTo` e as preferências do render atual, sem recriar o controlador.
  const advanceTo = useEffectEvent((index: number) => scrollTo(index));
  const applyPreferences = useEffectEvent((controller: HighlightCarouselController) => {
    controller.setPause('explicit', pausedByUser);
    controller.setPause('reducedMotion', reducedMotion);
  });

  useEffect(() => {
    const section = trackRef.current?.closest('section');
    if (!interactive || !section) return;
    const controller = new HighlightCarouselController(itemCount, (index) => advanceTo(index));
    controllerRef.current = controller;
    applyPreferences(controller);
    const updateVisibility = () => controller.setPause('hidden', document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => controller.setPause('offscreen', !entry?.isIntersecting),
      { threshold: 0.1 },
    );
    updateVisibility();
    observer.observe(section);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      controller.destroy();
      controllerRef.current = null;
      observer.disconnect();
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, [interactive, itemCount]);

  useEffect(() => {
    controllerRef.current?.setPause('explicit', pausedByUser);
  }, [pausedByUser]);

  useEffect(() => {
    controllerRef.current?.setPause('reducedMotion', reducedMotion);
  }, [reducedMotion]);

  function syncFromScroll() {
    const track = trackRef.current;
    if (!track) return;
    const programmed = programmedScrollRef.current;
    if (programmed) {
      if (Math.abs(track.scrollLeft - programmed.offset) > 1) return;
      programmedScrollRef.current = null;
      setActive(programmed.index);
      return;
    }
    const index = getClosestHighlightIndex(track.scrollLeft, getSlideOffsets(track));
    setActive(index);
    controllerRef.current?.setIndex(index);
  }

  function goTo(index: number) {
    controllerRef.current?.setIndex(index);
    scrollTo(index, 'manual');
  }

  return (
    <section
      aria-label="Destaques da casa"
      aria-roledescription="carrossel"
      className="group/carousel relative mt-3"
      onFocusCapture={(event) => {
        if ((event.target as HTMLElement).matches(':focus-visible'))
          controllerRef.current?.setPause('focus', true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          controllerRef.current?.setPause('focus', false);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') controllerRef.current?.setPause('pointer', true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') controllerRef.current?.setPause('pointer', false);
      }}
      onPointerCancel={(event) => {
        if (event.pointerType !== 'mouse') controllerRef.current?.setPause('pointer', false);
      }}
      onPointerDown={(event) => {
        if (event.pointerType !== 'mouse') {
          programmedScrollRef.current = null;
          controllerRef.current?.setPause('pointer', true);
        }
      }}
      onPointerUp={(event) => {
        if (event.pointerType !== 'mouse') controllerRef.current?.setPause('pointer', false);
      }}
    >
      <m.div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="highlight-track"
        drag={enhanced && interactive ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragControls={drag.dragControls}
        dragElastic={0.12}
        dragListener={false}
        dragTransition={{ bounceStiffness: 360, bounceDamping: 32 }}
        onClickCapture={drag.blockClickAfterDrag}
        onDragEnd={drag.selectDraggedHighlight}
        onDragStart={drag.markDragged}
        onDragStartCapture={drag.preventNativeDrag}
        onPointerDown={drag.startMouseDrag}
        onScroll={syncFromScroll}
        ref={trackRef}
      >
        {items.map((highlight, index) => (
          <HighlightSlide
            highlight={highlight}
            isActive={!enhanced || active === index}
            key={highlight.id}
            position={index + 1}
            total={items.length}
          />
        ))}
      </m.div>
      {interactive && enhanced ? (
        <>
          {items.length <= MAX_DOTS ? (
            <div className="absolute inset-x-12 bottom-0 z-20 flex justify-center">
              {items.map((item, index) => (
                <button
                  aria-current={index === active ? 'true' : undefined}
                  aria-label={`Ir para destaque ${index + 1} de ${items.length}`}
                  className="flex h-11 min-w-0 max-w-11 flex-1 items-end justify-center rounded-full pb-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber"
                  key={item.id}
                  onClick={() => goTo(index)}
                  type="button"
                >
                  <span
                    className={`size-2 rounded-full shadow-[0_0_0_1px_rgba(23,17,13,0.25)] ${index === active ? 'bg-brand' : 'bg-white/90'}`}
                  />
                </button>
              ))}
            </div>
          ) : (
            <p
              aria-hidden="true"
              className="absolute inset-x-12 bottom-3 z-20 mx-auto flex h-5 w-fit items-center rounded-full bg-black/40 px-2.5 text-[11px] font-bold text-white backdrop-blur-sm"
            >
              {active + 1} de {items.length}
            </p>
          )}
          <button
            aria-label="Destaque anterior"
            className="absolute left-2 top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 transition-opacity focus:opacity-100 group-hover/carousel:opacity-100 md:grid focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-amber/50"
            onClick={() => goTo(previousHighlightIndex(active, items.length))}
            type="button"
          >
            <Icon name="back" />
          </button>
          <button
            aria-label="Próximo destaque"
            className="absolute right-2 top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 transition-opacity focus:opacity-100 group-hover/carousel:opacity-100 md:grid focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-amber/50"
            onClick={() => goTo((active + 1) % items.length)}
            type="button"
          >
            <Icon name="arrow-simple" />
          </button>
          {/* Com movimento reduzido nada troca sozinho, e o botão não teria o que pausar. */}
          {reducedMotion ? null : (
            <button
              aria-label={pausedByUser ? 'Continuar destaques' : 'Pausar destaques'}
              className="absolute bottom-0 right-1 z-20 grid size-11 place-items-center rounded-full text-white"
              onClick={() => setPausedByUser((paused) => !paused)}
              type="button"
            >
              <span className="grid size-8 place-items-center rounded-full bg-black/45 backdrop-blur-sm">
                <Icon height={16} name={pausedByUser ? 'play' : 'pause'} width={16} />
              </span>
            </button>
          )}
          <p aria-atomic="true" aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </>
      ) : null}
    </section>
  );
}
