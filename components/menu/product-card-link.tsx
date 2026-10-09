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

export function ProductCardLink({ href, label }: Readonly<{ href: string; label: string }>) {
  return <Link aria-label={label} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-strong text-white shadow-brand transition-colors hover:bg-positive focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href={href}><ProductCardLinkContent /></Link>;
}
