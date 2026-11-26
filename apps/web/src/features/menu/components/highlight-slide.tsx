import Link from 'next/link';

import { getPublicImageVariantUrl } from '@/features/media/rules/media-urls';
import { MediaImage } from '@/features/media/components/media-image';
import type { MenuHighlight } from '@/features/menu/types';
import { splitLastWord } from '@/features/menu/rules/presentation';
import { rememberProductOrigin } from '@/features/menu/rules/product-origin';

import { CoxinhaArt } from './coxinha-art';
import { Icon } from './icons';

export function HighlightSlide({
  highlight,
  position,
  total,
  isActive,
}: Readonly<{ highlight: MenuHighlight; position: number; total: number; isActive: boolean }>) {
  const title = splitLastWord(highlight.title);
  const imageSrc = getPublicImageVariantUrl('highlight-images', highlight.image_path, 'detail');
  // Em celular baixo (375x667) o banner encolhe para a primeira tela já mostrar produtos e preço.
  return (
    <div
      aria-hidden={!isActive}
      className="relative h-[270px] min-w-full snap-center min-[390px]:h-[252px] sm:h-[240px] [@media(max-height:700px)]:h-[clamp(180px,28svh,252px)]"
      inert={!isActive}
      role="group"
      aria-label={`${position} de ${total}`}
    >
      <Link
        className="focus-ring-inset relative block h-full overflow-hidden rounded-[24px] bg-ink p-5 text-white"
        href={highlight.target || '/cardapio'}
        onClick={() => {
          if (highlight.target?.startsWith('/produto/')) rememberProductOrigin(highlight.target);
        }}
        tabIndex={isActive ? 0 : -1}
      >
        {imageSrc ? (
          <MediaImage
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            name={highlight.title}
            priority={position === 1}
            sizes="(max-width: 480px) 100vw, 480px"
            src={imageSrc}
          />
        ) : (
          <CoxinhaArt className="absolute inset-0 h-full w-full" variant="banner" />
        )}
        {/* Véu que garante contraste AA em toda a largura do texto (até 78%), mesmo em foto clara. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(23,17,13,0.86)_0%,rgba(23,17,13,0.76)_45%,rgba(23,17,13,0.64)_78%,rgba(23,17,13,0.3)_100%)]"
        />
        <div className="relative z-10 max-w-[78%] sm:max-w-[60%]">
          <span className="inline-flex rounded-full bg-brand-strong px-2.5 py-1 font-[family-name:var(--font-poppins)] text-[10px] font-semibold tracking-[0.08em]">
            DESTAQUE DA CASA
          </span>
          <h2 className="display mt-2 line-clamp-3 text-[clamp(24px,7vw,30px)] leading-[1.12] [@media(max-height:700px)]:line-clamp-2">
            {title.leading ? <>{title.leading} </> : null}
            <span className="text-amber">{title.last}</span>
          </h2>
          {highlight.description ? (
            <p className="mt-1.5 line-clamp-2 text-[13px] leading-[18px] text-cream [@media(max-height:700px)]:hidden">
              {highlight.description}
            </p>
          ) : null}
          <span className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-brand-strong px-4 font-[family-name:var(--font-poppins)] text-sm font-semibold">
            Conferir <Icon height={16} name="arrow" width={16} />
          </span>
        </div>
      </Link>
    </div>
  );
}
