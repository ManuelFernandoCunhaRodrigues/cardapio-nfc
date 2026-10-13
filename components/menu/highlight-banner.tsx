'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';

import { getPublicImageVariantUrl } from '@/lib/media';
import type { MenuHighlight } from '@/lib/menu/types';
import { splitLastWord } from '@/lib/menu/presentation';

import { Icon } from './icons';
import { MediaImage } from './media-image';

export function HighlightBanner({ highlights }: Readonly<{ highlights: MenuHighlight[] }>) {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const items = highlights.length ? highlights : [{ id: 'default', title: 'Salgados quentinhos', description: 'Feitos com carinho para matar a fome.', image_path: null, target: '/cardapio', sort_order: 0 }];

  function updateActive() {
    const track = trackRef.current;
    if (!track?.clientWidth) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  }

  return <section aria-label="Destaques" className="relative mt-3">
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onScroll={updateActive} ref={trackRef}>
      {items.map((highlight, index) => {
        const title = splitLastWord(highlight.title);
        return <Link className="relative h-[196px] min-w-full snap-center overflow-hidden rounded-[24px] bg-[radial-gradient(120%_90%_at_82%_62%,rgba(230,95,42,.5),rgba(230,95,42,0)_60%),#17110D] p-4 text-white focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/30" href={highlight.target || '/cardapio'} key={highlight.id}>
          <div className="relative z-10 max-w-[58%]"><span className="inline-flex rounded-full bg-brand-strong px-2.5 py-1 font-[family-name:var(--font-poppins)] text-[10px] font-semibold tracking-[0.08em]">DESTAQUE DA CASA</span><h2 className="display mt-2 text-[28px] leading-8">{title.leading ? <>{title.leading}<br /></> : null}<span className="text-amber">{title.last}</span></h2>{highlight.description ? <p className="mt-1.5 line-clamp-2 text-xs leading-4 text-sand">{highlight.description}</p> : null}<span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-strong px-3.5 font-[family-name:var(--font-poppins)] text-sm font-semibold">Conferir <Icon height={16} name="arrow" width={16} /></span></div>
          <div className="absolute -bottom-5 -right-3 h-[190px] w-[52%]"><MediaImage alt="" className="h-full w-full object-contain" name={highlight.title} priority={index === 0} sizes="(max-width: 480px) 52vw, 250px" src={getPublicImageVariantUrl('highlight-images', highlight.image_path, 'detail')} /></div>
        </Link>;
      })}
    </div>
    {items.length > 1 ? <div aria-hidden="true" className="pointer-events-none absolute bottom-6 left-[42%] z-20 flex gap-1.5">{items.map((item, index) => <span className={`size-1.5 rounded-full ${index === active ? 'bg-amber' : 'bg-white/90'}`} key={item.id} />)}</div> : null}
  </section>;
}
