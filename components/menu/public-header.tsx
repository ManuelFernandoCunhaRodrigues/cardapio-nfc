import Image from 'next/image';
import Link from 'next/link';

import type { StoreStatus } from '@/lib/store/opening-hours';

import { Icon } from './icons';

export function PublicHeader({ status }: Readonly<{ status: StoreStatus | null }>) {
  const isOpen = status?.isOpen;
  return <header className="grid h-[68px] grid-cols-[104px_1fr_104px] items-center px-4">
    {status ? <Link className={`inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full px-3 font-[family-name:var(--font-poppins)] text-xs font-semibold focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20 ${isOpen ? 'bg-green-soft text-green' : 'bg-danger-soft text-danger'}`} href="/info"><span aria-hidden="true" className="size-2 rounded-full bg-current" />{isOpen ? 'Aberta' : 'Fechada'}</Link> : <span />}
    <Link aria-label="Página inicial da Salgaê" className="grid justify-items-center focus-visible:rounded-lg focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/">
      <Image alt="Salgaê" className="h-11 w-auto" height={583} src="/brand/salgae-logo-recortada.webp" width={1042} />
      <span className="mt-0.5 whitespace-nowrap font-[family-name:var(--font-poppins)] text-[10px] font-semibold tracking-[0.14em] text-muted">SALGADOS QUENTES</span>
    </Link>
    <Link aria-label="Informações da loja" className="grid size-11 justify-self-end place-items-center rounded-[14px] border border-border-inner bg-white text-ink shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/info"><Icon name="info" /></Link>
  </header>;
}
