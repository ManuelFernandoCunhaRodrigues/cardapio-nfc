import type { Metadata } from 'next';
import Link from 'next/link';

import { HighlightBanner } from '@/features/menu/components/highlight-banner';
import { HorizontalScroll } from '@/features/menu/components/horizontal-scroll';
import { Icon } from '@/features/menu/components/icons';
import { MediaImage } from '@/features/media/components/media-image';
import { ProductCard } from '@/features/menu/components/product-card';
import { ProductRow } from '@/features/menu/components/product-row';
import { getPublicImageVariantUrl } from '@/features/media/rules/media-urls';
import { getCategoryIcon } from '@/features/menu/rules/category-icon';
import { getPublicMenu, getPublicStore } from '@/lib/api/public-api-client';
import { getPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import type { MenuCategory } from '@/features/menu/types';
import { selectFeaturedProducts } from '@salgae/core/rules/product-sort';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata('home', await getPublicStore());
}

export default async function HomePage() {
  const [menu, settings] = await Promise.all([getPublicMenu(), getPublicStore()]);
  const featured = selectFeaturedProducts(menu.products, 8);

  return (
    <main className="px-4 pb-6 pt-1">
      <h1 className="sr-only">Cardápio da {settings.name}</h1>
      <Link
        className="flex min-h-12 items-center gap-3 rounded-full border border-border bg-white px-4 text-sm text-placeholder shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40"
        href="/busca?focus=1"
      >
        <Icon className="text-muted" name="search" />
        <span>Busque seu salgado favorito</span>
      </Link>
      {settings.notice ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-soft px-3.5 py-2 text-xs font-bold leading-4 text-ink">
          <Icon height={16} name="info" width={16} />
          {settings.notice}
        </p>
      ) : null}
      <HighlightBanner highlights={menu.highlights} />
      <HorizontalScroll
        aria-label="Categorias"
        as="nav"
        className="-mx-4 mt-3 flex gap-3.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {menu.categories.map((category) => (
          <Link
            className="flex w-[52px] shrink-0 flex-col items-center gap-1.5 text-center font-[family-name:var(--font-poppins)] text-xs font-medium text-ink focus-visible:rounded-lg focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
            href={`/cardapio#${category.slug}`}
            key={category.id}
          >
            <span className="grid size-[52px] overflow-hidden rounded-full bg-white shadow-card">
              {category.image_path ? (
                <MediaImage
                  alt=""
                  className="h-full w-full"
                  name={category.name}
                  src={getPublicImageVariantUrl('product-images', category.image_path, 'card')}
                />
              ) : (
                <CategoryFallbackIcon category={category} />
              )}
            </span>
            <span className="line-clamp-1 w-16">{category.name}</span>
          </Link>
        ))}
      </HorizontalScroll>
      <section className="mt-5" aria-labelledby="mais-pedidos">
        <div className="flex items-center justify-between gap-3">
          <h2 className="disp text-lg font-semibold text-ink" id="mais-pedidos">
            Mais pedidos
          </h2>
          <Link
            className="-my-3 inline-flex min-h-11 items-center gap-1 py-3 font-[family-name:var(--font-poppins)] text-sm font-semibold text-brand-strong focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
            href="/cardapio"
          >
            Ver todos <Icon height={16} name="arrow" width={16} />
          </Link>
        </div>
        {featured.length ? (
          <ProductRow ariaLabel="Produtos mais pedidos" className="mt-1">
            {featured.map((product) => (
              <ProductCard compact key={product.id} product={product} />
            ))}
          </ProductRow>
        ) : (
          <p className="mt-3 rounded-product bg-white p-4 text-sm text-muted">
            Ainda não há itens disponíveis. Fale com a equipe no balcão.
          </p>
        )}
      </section>
    </main>
  );
}

function CategoryFallbackIcon({ category }: Readonly<{ category: MenuCategory }>) {
  const icon = getCategoryIcon(category);
  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center ${icon.kind === 'emoji' ? 'text-2xl' : 'disp bg-peach text-xl font-bold text-brand-strong'}`}
    >
      {icon.symbol}
    </span>
  );
}
