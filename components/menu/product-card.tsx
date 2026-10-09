import Link from 'next/link';

import { getBadgeLabel } from '@/lib/menu/badges';
import { getPublicMediaUrl } from '@/lib/media';
import type { MenuProduct } from '@/lib/menu/types';
import { formatPriceBRL } from '@/lib/utils/format-price';

import { Icon } from './icons';
import { MediaImage } from './media-image';

export function ProductCard({ product, compact = false }: Readonly<{ product: MenuProduct; compact?: boolean }>) {
  const label = getBadgeLabel(product.badge);
  return <article className={`relative overflow-hidden rounded-product border border-border/80 bg-white shadow-card ${compact ? 'w-[156px] shrink-0' : 'min-w-0'}`}>
    <div className="relative aspect-[1.15] overflow-hidden bg-ink">
      <MediaImage alt={product.name} className={`h-full w-full ${!product.is_available ? 'grayscale opacity-45' : ''}`} name={product.name} src={getPublicMediaUrl('product-images', product.image_path)} />
      {label ? <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-1 font-mono text-[8px] font-bold tracking-[0.09em] text-cream">{label}</span> : null}
      {!product.is_available ? <span className="absolute bottom-2 left-2 rounded-full bg-danger px-2 py-1 font-mono text-[8px] font-bold tracking-[0.09em] text-white">INDISPONÍVEL</span> : null}
    </div>
    <div className="p-3">
      <h3 className="disp truncate text-[13px] font-bold text-ink">{product.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-muted">{product.description || 'Feito na Salgaê'}</p>
      <div className="mt-3 flex items-center justify-between gap-2"><p className="disp text-base font-extrabold text-brand">{formatPriceBRL(product.price_cents)}</p><Link aria-label={`Ver detalhes de ${product.name}`} className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white shadow-brand transition-colors hover:bg-positive focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href={`/produto/${product.id}`}><Icon name="arrow" /></Link></div>
    </div>
  </article>;
}
