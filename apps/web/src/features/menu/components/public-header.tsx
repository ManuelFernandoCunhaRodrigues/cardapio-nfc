import Link from 'next/link';

import { BrandLogo } from '@/components/brand/brand-logo';
import type { PublicStoreStatusSettings } from '@/features/store/rules/client-status';

import { ShareButton } from './share-button';
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
    <header className="grid h-[68px] grid-cols-[96px_minmax(0,1fr)_96px] items-center px-4">
      {settings ? <StoreHeaderStatus initialNow={initialNow} settings={settings} /> : <span />}
      <Link
        className="flex min-w-0 flex-col items-center focus-visible:rounded-lg focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
        href="/"
      >
        <span className="sr-only">Página inicial da</span>
        <BrandLogo alt={storeName} className="h-11 w-auto" width={79} />
        {/* Em 360 px sobram ~136 px no meio: espaçamento menor e reticências se a frase não couber. */}
        <span className="mt-0.5 max-w-full truncate font-[family-name:var(--font-poppins)] text-[10px] font-semibold uppercase tracking-[0.08em] text-muted min-[380px]:tracking-[0.14em]">
          {tagline ?? DEFAULT_TAGLINE}
        </span>
      </Link>
      {/* A Info já tem a aba e a pílula de status; aqui fica o compartilhar, que o topo não tinha. */}
      <ShareButton storeName={storeName} />
    </header>
  );
}
