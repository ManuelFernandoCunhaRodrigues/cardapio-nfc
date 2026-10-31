'use client';

import { useEffect, useRef, useState } from 'react';
import * as m from 'motion/react-m';

import {
  getClosestHighlightIndex,
  getRelativeSlideOffsets,
  HighlightCarouselController,
  previousHighlightIndex,
} from '@/features/menu/rules/highlight-carousel';
import type { MenuHighlight } from '@/features/menu/types';
import { useHighlightDrag } from '@/features/menu/hooks/use-highlight-drag';
import { useHydrated } from '@/hooks/use-client-snapshot';

import { HighlightSlide } from './highlight-slide';
import { Icon } from './icons';

// Acima disso os pontos não cabem na largura do banner e dão lugar a um contador.
const MAX_DOTS = 8;

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
  const interactive = highlights.length > 1;
  const [active, setActive] = useState(0);
  const enhanced = useHydrated();
  const [announcement, setAnnouncement] = useState('');
  const trackRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HighlightCarouselController | null>(null);
  const reducedMotionRef = useRef(false);
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
    track.scrollTo({ left: offset, behavior: reducedMotionRef.current ? 'auto' : 'smooth' });
    if (source === 'manual') setAnnouncement(`Destaque ${index + 1} de ${items.length}`);
  }

  useEffect(() => {
    if (!interactive) return;
    const controller = new HighlightCarouselController(items.length, (index) => scrollTo(index));
    controllerRef.current = controller;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateReducedMotion = () => {
      reducedMotionRef.current = media.matches;
      controller.setPause('reducedMotion', media.matches);
    };
    const updateVisibility = () => controller.setPause('hidden', document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => controller.setPause('offscreen', !entry?.isIntersecting),
      { threshold: 0.1 },
    );
    updateReducedMotion();
    updateVisibility();
    observer.observe(trackRef.current!.closest('section')!);
    media.addEventListener('change', updateReducedMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      controller.destroy();
      controllerRef.current = null;
      observer.disconnect();
      media.removeEventListener('change', updateReducedMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
    // The item count is stable for the mounted server-rendered banner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, items.length]);

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
            <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center">
              {items.map((item, index) => (
                <button
                  aria-label={`Ir para destaque ${index + 1} de ${items.length}`}
                  className="grid h-8 w-6 place-items-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber"
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
              className="absolute inset-x-0 bottom-2 z-20 mx-auto flex h-5 w-fit items-center rounded-full bg-black/40 px-2.5 text-[11px] font-bold text-white backdrop-blur-sm"
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
          <p aria-atomic="true" aria-live="polite" className="sr-only">
            {announcement}
          </p>
        </>
      ) : null}
    </section>
  );
}
