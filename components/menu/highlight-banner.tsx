'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  getClosestHighlightIndex,
  getRelativeSlideOffsets,
  HighlightCarouselController,
  previousHighlightIndex,
} from '@/lib/menu/highlight-carousel';
import { getPublicImageVariantUrl } from '@/lib/media';
import type { MenuHighlight } from '@/lib/menu/types';
import { splitLastWord } from '@/lib/menu/presentation';
import { rememberProductOrigin } from '@/lib/menu/product-origin';

import { CoxinhaArt } from './coxinha-art';
import { Icon } from './icons';
import { MediaImage } from './media-image';

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
  const enhanced = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [announcement, setAnnouncement] = useState('');
  const trackRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HighlightCarouselController | null>(null);
  const reducedMotionRef = useRef(false);
  const programmedScrollRef = useRef<{ index: number; offset: number } | null>(null);

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
      <div
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={syncFromScroll}
        ref={trackRef}
      >
        {items.map((highlight, index) => {
          const title = splitLastWord(highlight.title);
          const isActive = !enhanced || active === index;
          const imageSrc = highlight.image_path?.startsWith('/')
            ? highlight.image_path
            : getPublicImageVariantUrl(
                'highlight-images',
                highlight.image_path,
                'detail',
              );
          return (
            <div
              aria-hidden={!isActive}
              className="relative h-[270px] min-w-full snap-center min-[390px]:h-[252px] sm:h-[240px]"
              inert={!isActive}
              key={highlight.id}
              role="group"
              aria-label={`${index + 1} de ${items.length}`}
            >
              <Link
                className="relative block h-full overflow-hidden rounded-[24px] bg-ink p-5 text-white focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40"
                href={highlight.target || '/cardapio'}
                onClick={() => {
                  if (highlight.target?.startsWith('/produto/'))
                    rememberProductOrigin(highlight.target);
                }}
                tabIndex={isActive ? 0 : -1}
              >
                {imageSrc ? (
                  <MediaImage
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    name={highlight.title}
                    priority={index === 0}
                    sizes="(max-width: 480px) 100vw, 480px"
                    src={imageSrc}
                  />
                ) : (
                  <CoxinhaArt className="absolute inset-0 h-full w-full" variant="banner" />
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,17,13,0.72)_0%,rgba(23,17,13,0.6)_34%,rgba(23,17,13,0.38)_58%,rgba(23,17,13,0.1)_78%,rgba(23,17,13,0)_100%)]"
                />
                <div className="relative z-10 max-w-[78%] sm:max-w-[60%]">
                  <span className="inline-flex rounded-full bg-brand-strong px-2.5 py-1 font-[family-name:var(--font-poppins)] text-[10px] font-semibold tracking-[0.08em]">
                    DESTAQUE DA CASA
                  </span>
                  <h2 className="display mt-2 line-clamp-3 text-[clamp(24px,7vw,30px)] leading-[1.12]">
                    {title.leading ? <>{title.leading} </> : null}
                    <span className="text-amber">{title.last}</span>
                  </h2>
                  {highlight.description ? (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-4 text-sand">
                      {highlight.description}
                    </p>
                  ) : null}
                  <span className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-strong px-4 font-[family-name:var(--font-poppins)] text-sm font-semibold">
                    Conferir <Icon height={16} name="arrow" width={16} />
                  </span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>
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
