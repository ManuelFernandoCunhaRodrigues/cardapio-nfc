'use client';

import Link, { useLinkStatus } from 'next/link';

import { Icon } from './icons';

function ProductCardLinkContent() {
  const { pending } = useLinkStatus();
  return <span aria-busy={pending} className="grid place-items-center">
    {pending ? <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : <Icon name="arrow" />}
    <span className="sr-only" role="status">{pending ? 'Abrindo detalhes do produto…' : ''}</span>
  </span>;
}

export function ProductCardLink({ href, label, onImage = false }: Readonly<{ href: string; label: string; onImage?: boolean }>) {
  return <Link aria-label={label} className={`grid size-11 shrink-0 place-items-center rounded-full bg-brand-strong text-white transition-colors hover:bg-positive focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20 ${onImage ? 'ring-2 ring-white shadow-[0_2px_8px_rgba(23,17,13,0.35)]' : 'shadow-brand'}`} href={href}><ProductCardLinkContent /></Link>;
}
