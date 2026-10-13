'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { getClosestHighlightIndex, getRelativeSlideOffsets, HighlightCarouselController, previousHighlightIndex } from '@/lib/menu/highlight-carousel';
import { getPublicImageVariantUrl } from '@/lib/media';
import type { MenuHighlight } from '@/lib/menu/types';
import { splitLastWord } from '@/lib/menu/presentation';
import { rememberProductOrigin } from '@/lib/menu/product-origin';

import { CoxinhaArt } from './coxinha-art';
import { Icon } from './icons';
import { MediaImage } from './media-image';

const fallback: MenuHighlight = { id: 'default', title: 'Salgados quentinhos', description: 'Feitos com carinho para matar a fome.', image_path: null, target: '/cardapio', sort_order: 0 };

export function HighlightBanner({ highlights }: Readonly<{ highlights: MenuHighlight[] }>) {
  const items = highlights.length ? highlights : [fallback];
  const interactive = highlights.length > 1;
  const [active, setActive] = useState(0);
  const enhanced = useSyncExternalStore(() => () => {}, () => true, () => false);
  const [explicitlyPaused, setExplicitlyPaused] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const trackRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HighlightCarouselController | null>(null);
  const reducedMotionRef = useRef(false);
  const programmedScrollRef = useRef<{ index: number; offset: number } | null>(null);

  function getSlideOffsets(track: HTMLDivElement) {
    return getRelativeSlideOffsets(track.offsetLeft, Array.from(track.children, (child) => (child as HTMLElement).offsetLeft));
  }

  function scrollTo(index: number, source: 'automatic' | 'manual' = 'automatic') {
    const track = trackRef.current;
    if (!track) return;
    const offset = getSlideOffsets(track)[index] ?? 0;
    programmedScrollRef.current = Math.abs(track.scrollLeft - offset) > 1 ? { index, offset } : null;
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
    const observer = new IntersectionObserver(([entry]) => controller.setPause('offscreen', !entry?.isIntersecting), { threshold: 0.1 });
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

  return <section aria-label="Destaques da casa" aria-roledescription="carrossel" className="group/carousel relative mt-3" onFocusCapture={(event) => {
    if ((event.target as HTMLElement).matches(':focus-visible')) controllerRef.current?.setPause('focus', true);
  }} onBlurCapture={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) controllerRef.current?.setPause('focus', false);
  }} onPointerEnter={(event) => {
    if (event.pointerType === 'mouse') controllerRef.current?.setPause('pointer', true);
  }} onPointerLeave={(event) => {
    if (event.pointerType === 'mouse') controllerRef.current?.setPause('pointer', false);
  }} onPointerCancel={(event) => {
    if (event.pointerType !== 'mouse') controllerRef.current?.setPause('pointer', false);
  }} onPointerDown={(event) => {
    if (event.pointerType !== 'mouse') {
      programmedScrollRef.current = null;
      controllerRef.current?.setPause('pointer', true);
    }
  }} onPointerUp={(event) => {
    if (event.pointerType !== 'mouse') controllerRef.current?.setPause('pointer', false);
  }}>
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onScroll={syncFromScroll} ref={trackRef}>
      {items.map((highlight, index) => {
        const title = splitLastWord(highlight.title);
        const isActive = !enhanced || active === index;
        return <div aria-hidden={!isActive} className="relative h-[208px] min-w-full snap-center [@media(max-height:699px)]:h-[148px]" inert={!isActive} key={highlight.id} role="group" aria-label={`${index + 1} de ${items.length}`}>
          <Link className="relative block h-full overflow-hidden rounded-[24px] bg-ink bg-[radial-gradient(120%_90%_at_82%_62%,rgba(230,95,42,.5),rgba(230,95,42,0)_60%)] p-4 text-white focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40" href={highlight.target || '/cardapio'} onClick={() => { if (highlight.target?.startsWith('/produto/')) rememberProductOrigin(highlight.target); }} tabIndex={isActive ? 0 : -1}>
            <div className="relative z-10 max-w-[58%]"><span className="inline-flex rounded-full bg-brand-strong px-2.5 py-1 font-[family-name:var(--font-poppins)] text-[10px] font-semibold tracking-[0.08em]">DESTAQUE DA CASA</span><h2 className="display mt-2 line-clamp-2 text-[28px] leading-8 [@media(max-height:699px)]:mt-1 [@media(max-height:699px)]:text-2xl [@media(max-height:699px)]:leading-6">{title.leading ? <>{title.leading} </> : null}<span className="text-amber">{title.last}</span></h2>{highlight.description ? <p className="mt-1.5 line-clamp-2 text-xs leading-4 text-sand [@media(max-height:699px)]:hidden">{highlight.description}</p> : null}<span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-strong px-3.5 font-[family-name:var(--font-poppins)] text-sm font-semibold [@media(max-height:699px)]:mt-2">Conferir <Icon height={16} name="arrow" width={16} /></span></div>
            <div className="absolute -bottom-5 -right-3 h-[190px] w-[52%]">{highlight.image_path ? <MediaImage alt="" className="h-full w-full object-contain" name={highlight.title} priority={index === 0} sizes="(max-width: 480px) 52vw, 250px" src={getPublicImageVariantUrl('highlight-images', highlight.image_path, 'detail')} /> : <CoxinhaArt className="h-full w-full" variant="banner" />}</div>
          </Link>
        </div>;
      })}
    </div>
    {interactive && enhanced ? <>
      {items.length <= 5 ? <div className="absolute bottom-3 right-[60px] z-20 flex items-center justify-end px-1.5"><span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-6 -translate-y-1/2 rounded-full bg-black/40 backdrop-blur-sm" />{items.map((item, index) => <button aria-label={`Ir para destaque ${index + 1} de ${items.length}`} className="relative grid h-11 w-6 place-items-center rounded-full focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-amber" key={item.id} onClick={() => goTo(index)} type="button"><span className={`size-1.5 rounded-full ${index === active ? 'bg-amber' : 'bg-white/90'}`} /></button>)}</div> : <p aria-hidden="true" className="absolute bottom-3 right-16 z-20 flex h-6 items-center rounded-full bg-black/40 px-2.5 text-xs font-bold text-white backdrop-blur-sm mb-2.5">{active + 1} de {items.length}</p>}
      <button aria-label={explicitlyPaused ? 'Retomar rotação automática' : 'Pausar rotação automática'} className="absolute bottom-3 right-3 z-20 grid size-11 place-items-center rounded-full bg-black/40 text-white backdrop-blur-sm focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-amber/50" onClick={() => { const paused = !explicitlyPaused; setExplicitlyPaused(paused); controllerRef.current?.setPause('explicit', paused); }} type="button"><Icon name={explicitlyPaused ? 'play' : 'pause'} /></button>
      <button aria-label="Destaque anterior" className="absolute left-2 top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 transition-opacity focus:opacity-100 group-hover/carousel:opacity-100 md:grid focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-amber/50" onClick={() => goTo(previousHighlightIndex(active, items.length))} type="button"><Icon name="back" /></button>
      <button aria-label="Próximo destaque" className="absolute right-2 top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 transition-opacity focus:opacity-100 group-hover/carousel:opacity-100 md:grid focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-amber/50" onClick={() => goTo((active + 1) % items.length)} type="button"><Icon name="arrow-simple" /></button>
      <p aria-atomic="true" aria-live="polite" className="sr-only">{announcement}</p>
    </> : null}
  </section>;
}
