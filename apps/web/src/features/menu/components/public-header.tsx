import Image from 'next/image';
import Link from 'next/link';

import type { PublicStoreStatusSettings } from '@/features/store/rules/client-status';

import { Icon } from './icons';
import { StoreHeaderStatus } from '@/features/store/components/store-status-live';

export function PublicHeader({
  settings,
  initialNow,
}: Readonly<{ settings: PublicStoreStatusSettings | null; initialNow: string }>) {
  return (
    <header className="grid h-[68px] grid-cols-[104px_1fr_104px] items-center px-4">
      {settings ? <StoreHeaderStatus initialNow={initialNow} settings={settings} /> : <span />}
      <Link
        className="grid justify-items-center focus-visible:rounded-lg focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
        href="/"
      >
        <span className="sr-only">Página inicial da</span>
        <Image
          alt="Salgaê"
          className="h-11 w-auto"
          height={583}
          src="/brand/salgae-logo-recortada.webp"
          width={1042}
        />
        <span className="mt-0.5 whitespace-nowrap font-[family-name:var(--font-poppins)] text-[10px] font-semibold tracking-[0.14em] text-muted">
          SALGADOS QUENTES
        </span>
      </Link>
      <Link
        aria-label="Informações da loja"
        className="grid size-11 justify-self-end place-items-center rounded-[14px] border border-border-inner bg-white text-ink shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
        href="/info"
      >
        <Icon name="info" />
      </Link>
    </header>
  );
}
