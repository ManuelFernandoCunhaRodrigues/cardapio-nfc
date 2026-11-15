import Link from 'next/link';

import { BrandLogo } from '@/components/brand/brand-logo';
import type { PublicStoreStatusSettings } from '@/features/store/rules/client-status';

import { Icon } from './icons';
import { StoreHeaderStatus } from '@/features/store/components/store-status-live';

const DEFAULT_TAGLINE = 'Salgados quentes';

export function PublicHeader({
  settings,
  initialNow,
  storeName,
  tagline,
}: Readonly<{
  settings: PublicStoreStatusSettings | null;
  initialNow: string;
  storeName: string;
  tagline: string | null;
}>) {
  return (
    <header className="grid h-[68px] grid-cols-[104px_1fr_104px] items-center px-4">
      {settings ? <StoreHeaderStatus initialNow={initialNow} settings={settings} /> : <span />}
      <Link
        className="grid min-w-0 justify-items-center focus-visible:rounded-lg focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
        href="/"
      >
        <span className="sr-only">Página inicial da</span>
        <BrandLogo alt={storeName} className="h-11 w-auto" width={79} />
        <span className="mt-0.5 max-w-full truncate font-[family-name:var(--font-poppins)] text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {tagline ?? DEFAULT_TAGLINE}
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
