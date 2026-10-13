import Link from 'next/link';

import type { MenuHighlight } from '@/lib/menu/types';

import { Icon } from './icons';

export function SecondaryHighlight({ highlight }: Readonly<{ highlight: MenuHighlight }>) {
  return <Link className="relative mt-2 block min-h-20 overflow-hidden rounded-card bg-brand-strong px-4 py-3.5 pr-24 text-white focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/25" href={highlight.target || '/cardapio'}><span className="font-[family-name:var(--font-poppins)] text-[10px] font-semibold tracking-[0.08em]">EM DESTAQUE</span><strong className="disp mt-0.5 block text-lg font-semibold">{highlight.title}</strong>{highlight.description ? <span className="line-clamp-1 text-xs leading-4">{highlight.description}</span> : null}<span aria-hidden="true" className="absolute right-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/15"><Icon name="arrow" /></span></Link>;
}
