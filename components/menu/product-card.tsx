import { getBadgeLabel } from '@/lib/menu/badges';
import { getPublicImageVariantUrl } from '@/lib/media';
import type { MenuProduct } from '@/lib/menu/types';
import { formatPriceBRL } from '@/lib/utils/format-price';

import { MediaImage } from './media-image';
import { ProductCardLink } from './product-card-link';

export function ProductCard({ product, compact = false }: Readonly<{ product: MenuProduct; compact?: boolean }>) {
  const label = getBadgeLabel(product.badge);
  return <article className={`relative overflow-hidden rounded-product border border-border/80 bg-white shadow-card ${compact ? 'w-[calc((100cqw-40px)/2.5)] shrink-0 snap-start' : 'min-w-0'}`}>
    <div className="relative aspect-[1.15] overflow-hidden bg-ink">
      <MediaImage alt={product.name} className={`h-full w-full ${!product.is_available ? 'grayscale opacity-45' : ''}`} name={product.name} sizes={compact ? '(max-width: 480px) 40vw, 180px' : '(max-width: 640px) 50vw, 320px'} src={getPublicImageVariantUrl('product-images', product.image_path, 'card')} />
      {compact ? (label || !product.is_available ? <div className="absolute left-2 top-2 flex flex-col items-start gap-1">{label ? <span className="rounded-full bg-ink px-2 py-1 font-mono text-[8px] font-bold tracking-[0.09em] text-cream">{label}</span> : null}{!product.is_available ? <span className="rounded-full bg-danger px-2 py-1 font-mono text-[8px] font-bold tracking-[0.09em] text-white">INDISPONÍVEL</span> : null}</div> : null) : <>{label ? <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-1 font-mono text-[8px] font-bold tracking-[0.09em] text-cream">{label}</span> : null}{!product.is_available ? <span className="absolute bottom-2 left-2 rounded-full bg-danger px-2 py-1 font-mono text-[8px] font-bold tracking-[0.09em] text-white">INDISPONÍVEL</span> : null}</>}
      {compact ? <div className="absolute bottom-2 right-2"><ProductCardLink href={`/produto/${product.id}`} label={`Ver detalhes de ${product.name}`} onImage /></div> : null}
    </div>
    <div className={compact ? 'p-2.5' : 'p-3'}>
      <h3 className={compact ? 'disp line-clamp-2 min-h-8 text-[13px] font-bold leading-4 text-ink' : 'disp truncate text-[13px] font-bold text-ink'}>{product.name}</h3>
      <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-4 text-muted">{product.description || 'Feito na Salgaê'}</p>
      <div className={compact ? 'mt-3' : 'mt-3 flex items-center justify-between gap-2'}><p className={compact ? 'disp whitespace-nowrap text-[15px] font-extrabold text-brand-strong' : 'disp text-base font-extrabold text-brand-strong'}>{formatPriceBRL(product.price_cents)}</p>{compact ? null : <ProductCardLink href={`/produto/${product.id}`} label={`Ver detalhes de ${product.name}`} />}</div>
    </div>
  </article>;
}
