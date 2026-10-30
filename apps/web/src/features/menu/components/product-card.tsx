'use client';

import Link from 'next/link';

import { getBadgeLabel } from '@/features/menu/rules/badges';
import { rememberProductOrigin } from '@/features/menu/rules/product-origin';
import { getPublicImageVariantUrl } from '@/features/media/rules/media-urls';
import type { MenuProduct } from '@/features/menu/types';
import { formatPriceBRL } from '@/lib/utils/format-price';

import { Icon } from './icons';
import { MediaImage } from '@/features/media/components/media-image';

const badgeColor = {
  mais_pedido: 'bg-ink',
  novo: 'bg-green',
  quentinho: 'bg-brand-strong',
} as const;

export function ProductCard({
  product,
  compact = false,
}: Readonly<{ product: MenuProduct; compact?: boolean }>) {
  const label = getBadgeLabel(product.badge);
  const href = `/produto/${product.slug}`;
  const card = (
    <Link
      className={`group block min-w-0 overflow-hidden rounded-product bg-white shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40 ${compact ? 'h-full' : 'min-h-[218px]'}`}
      href={href}
      onClick={() => rememberProductOrigin(href)}
    >
      <article className="relative flex h-full flex-col">
        <div
          className={`relative h-[108px] shrink-0 overflow-hidden ${product.is_available ? 'bg-[linear-gradient(180deg,#FFF6E6,#FBE5C8)]' : 'bg-[linear-gradient(180deg,#F5F0E5,#E8E0CF)]'}`}
        >
          <MediaImage
            alt=""
            className={`h-full w-full ${!product.is_available ? 'grayscale opacity-50' : ''}`}
            name={product.name}
            sizes={compact ? '(max-width: 480px) 40vw, 180px' : '(max-width: 640px) 50vw, 240px'}
            src={getPublicImageVariantUrl('product-images', product.image_path, 'card')}
          />
        </div>
        <div className={`flex min-h-0 flex-1 flex-col px-3 pb-3 pt-2.5`}>
          <h3
            className={`disp line-clamp-2 text-sm font-semibold leading-[18px] ${product.is_available ? 'text-ink' : 'text-muted'}`}
          >
            {product.name}
          </h3>
          <p className={`mt-0.5 line-clamp-2 text-xs leading-4 text-muted`}>
            {product.description || 'Feito na Salgaê'}
          </p>
          <div className="mt-auto flex items-center justify-between gap-1 pt-2">
            <p
              className={`disp whitespace-nowrap text-base font-bold leading-5 ${product.is_available ? 'text-brand-strong' : 'text-muted'}`}
            >
              {formatPriceBRL(product.price_cents)}
            </p>
            <span
              aria-hidden="true"
              className={`grid size-8 shrink-0 place-items-center rounded-full transition-transform group-hover:translate-x-0.5 ${product.is_available ? 'bg-brand-strong text-white shadow-brand' : 'bg-sand text-muted'}`}
            >
              <Icon height={16} name="arrow" width={16} />
            </span>
          </div>
        </div>
        {/* Depois do texto no DOM para o leitor de tela ouvir primeiro o nome; a posição na tela é absoluta. */}
        {label && product.is_available ? (
          <span
            className={`absolute left-2 top-2 rounded-full px-2 py-1 font-[family-name:var(--font-poppins)] text-[10px] font-semibold tracking-[0.08em] text-white ${product.badge ? badgeColor[product.badge] : 'bg-ink'}`}
          >
            {label}
          </span>
        ) : null}
        {!product.is_available ? (
          <span className="absolute left-2 top-2 rounded-full bg-danger px-2 py-1 font-[family-name:var(--font-poppins)] text-[10px] font-semibold tracking-[0.06em] text-white">
            INDISPONÍVEL
          </span>
        ) : null}
      </article>
    </Link>
  );
  return compact ? (
    <div className={`h-[242px] w-[calc((100cqw-40px)/2.5)] shrink-0 snap-start`} role="listitem">
      {card}
    </div>
  ) : (
    card
  );
}
