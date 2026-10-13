'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { HighlightCarouselController, previousHighlightIndex } from '@/lib/menu/highlight-carousel';
import { getPublicImageVariantUrl } from '@/lib/media';
import type { MenuHighlight } from '@/lib/menu/types';
import { splitLastWord } from '@/lib/menu/presentation';

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

  function scrollTo(index: number, source: 'automatic' | 'manual' = 'automatic') {
    const track = trackRef.current;
    if (!track) return;
    setActive(index);
    track.scrollTo({ left: index * track.clientWidth, behavior: reducedMotionRef.current ? 'auto' : 'smooth' });
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
    if (!track?.clientWidth) return;
    const index = Math.max(0, Math.min(items.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
    setActive(index);
    controllerRef.current?.setIndex(index);
  }

  function goTo(index: number) {
    controllerRef.current?.setIndex(index);
    scrollTo(index, 'manual');
  }

  return <section aria-label="Destaques da casa" aria-roledescription="carrossel" className="group/carousel relative mt-3" onFocusCapture={() => controllerRef.current?.setPause('focus', true)} onBlurCapture={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) controllerRef.current?.setPause('focus', false);
  }} onMouseEnter={() => controllerRef.current?.setPause('pointer', true)} onMouseLeave={() => controllerRef.current?.setPause('pointer', false)} onPointerCancel={() => controllerRef.current?.setPause('pointer', false)} onPointerDown={() => controllerRef.current?.setPause('pointer', true)} onPointerUp={() => controllerRef.current?.setPause('pointer', false)}>
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onScroll={syncFromScroll} ref={trackRef}>
      {items.map((highlight, index) => {
        const title = splitLastWord(highlight.title);
        const isActive = !enhanced || active === index;
        return <div aria-hidden={!isActive} className="relative h-[196px] min-w-full snap-center" inert={!isActive} key={highlight.id} role="group" aria-label={`${index + 1} de ${items.length}`}>
          <Link className="relative block h-full overflow-hidden rounded-[24px] bg-[radial-gradient(120%_90%_at_82%_62%,rgba(230,95,42,.5),rgba(230,95,42,0)_60%),#17110D] p-4 text-white focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/30" href={highlight.target || '/cardapio'} tabIndex={isActive ? 0 : -1}>
            <div className="relative z-10 max-w-[58%]"><span className="inline-flex rounded-full bg-brand-strong px-2.5 py-1 font-[family-name:var(--font-poppins)] text-[10px] font-semibold tracking-[0.08em]">DESTAQUE DA CASA</span><h2 className="display mt-2 text-[28px] leading-8">{title.leading ? <>{title.leading}<br /></> : null}<span className="text-amber">{title.last}</span></h2>{highlight.description ? <p className="mt-1.5 line-clamp-2 text-xs leading-4 text-sand">{highlight.description}</p> : null}<span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-strong px-3.5 font-[family-name:var(--font-poppins)] text-sm font-semibold">Conferir <Icon height={16} name="arrow" width={16} /></span></div>
            <div className="absolute -bottom-5 -right-3 h-[190px] w-[52%]"><MediaImage alt="" className="h-full w-full object-contain" name={highlight.title} priority={index === 0} sizes="(max-width: 480px) 52vw, 250px" src={getPublicImageVariantUrl('highlight-images', highlight.image_path, 'detail')} /></div>
          </Link>
        </div>;
      })}
    </div>
    {interactive && enhanced ? <>
      <div className="absolute bottom-3 left-[42%] z-20 flex items-center gap-0.5">{items.map((item, index) => <button aria-label={`Ir para destaque ${index + 1} de ${items.length}`} className="grid size-11 place-items-center rounded-full focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-amber/50" key={item.id} onClick={() => goTo(index)} type="button"><span className={`size-1.5 rounded-full ${index === active ? 'bg-amber' : 'bg-white/90'}`} /></button>)}</div>
      <button aria-label={explicitlyPaused ? 'Retomar rotação automática' : 'Pausar rotação automática'} className="absolute bottom-3 right-3 z-20 grid size-11 place-items-center rounded-full bg-black/20 text-white backdrop-blur-sm focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-amber/50" onClick={() => { const paused = !explicitlyPaused; setExplicitlyPaused(paused); controllerRef.current?.setPause('explicit', paused); }} type="button"><Icon name={explicitlyPaused ? 'play' : 'pause'} /></button>
      <button aria-label="Destaque anterior" className="absolute left-2 top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 transition-opacity focus:opacity-100 group-hover/carousel:opacity-100 md:grid focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-amber/50" onClick={() => goTo(previousHighlightIndex(active, items.length))} type="button"><Icon name="back" /></button>
      <button aria-label="Próximo destaque" className="absolute right-2 top-1/2 z-20 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-black/30 text-white opacity-0 transition-opacity focus:opacity-100 group-hover/carousel:opacity-100 md:grid focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-amber/50" onClick={() => goTo((active + 1) % items.length)} type="button"><Icon name="arrow-simple" /></button>
      <p aria-atomic="true" aria-live="polite" className="sr-only">{announcement}</p>
    </> : null}
  </section>;
}
