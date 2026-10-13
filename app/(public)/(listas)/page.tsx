import Link from 'next/link';

import { HighlightBanner } from '@/components/menu/highlight-banner';
import { Icon } from '@/components/menu/icons';
import { MediaImage } from '@/components/menu/media-image';
import { ProductCard } from '@/components/menu/product-card';
import { ProductRow } from '@/components/menu/product-row';
import { getPublicImageVariantUrl } from '@/lib/media';
import { getPublicMenu, getPublicStoreSettings } from '@/lib/menu/get-public-menu';
import { sortProductsForHome } from '@/lib/menu/sort';

export const revalidate = 60;

const categoryEmoji: Record<string, string> = { coxinhas: '🥟', pasteis: '🥠', porcoes: '🍟', combos: '🍱', drinks: '🥤', bebidas: '🥤', doces: '🍫' };

export default async function HomePage() {
  const [menu, settings] = await Promise.all([getPublicMenu(), getPublicStoreSettings()]);
  const menuFailed = menu.categories.error || menu.products.error || menu.highlights.error;
  const products = menu.products.data ?? [];
  const highlights = menu.highlights.data ?? [];
  const featured = sortProductsForHome(products).slice(0, 8);

  return <main className="px-4 pb-6 pt-1"><h1 className="sr-only">Cardápio da Salgaê</h1>
    <Link className="flex min-h-12 items-center gap-3 rounded-full border border-border bg-white px-4 text-sm text-placeholder shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/busca"><Icon className="text-muted" name="search" /><span>Busque seu salgado favorito</span></Link>
    {settings?.notice ? <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-soft px-3.5 py-2 text-xs font-bold leading-4 text-ink"><Icon height={16} name="info" width={16} />{settings.notice}</p> : null}
    {menuFailed ? <section className="mt-5 rounded-card border border-border bg-white p-5"><h1 className="disp text-xl font-bold text-ink">O cardápio está dando uma pausa</h1><p className="mt-2 text-sm leading-6 text-muted">Tente atualizar em instantes ou consulte a equipe no balcão.</p></section> : <>
      <HighlightBanner highlights={highlights} />
      <nav aria-label="Categorias" className="-mx-4 mt-3 flex gap-3.5 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{(menu.categories.data ?? []).map((category) => <Link className="flex w-[52px] shrink-0 flex-col items-center gap-1.5 text-center font-[family-name:var(--font-poppins)] text-xs font-medium text-ink focus-visible:rounded-lg focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href={`/cardapio#${category.slug}`} key={category.id}><span className="grid size-[52px] overflow-hidden rounded-full bg-white shadow-card">{category.image_path ? <MediaImage alt="" className="h-full w-full" name={category.name} src={getPublicImageVariantUrl('product-images', category.image_path, 'card')} /> : <span aria-hidden="true" className="grid place-items-center text-2xl">{categoryEmoji[category.slug] ?? '🍽️'}</span>}</span><span className="line-clamp-1 w-16">{category.name}</span></Link>)}</nav>
      <section className="mt-5" aria-labelledby="mais-pedidos"><div className="flex items-center justify-between gap-3"><h2 className="disp text-lg font-semibold text-ink" id="mais-pedidos">Mais pedidos</h2><Link className="-my-3 inline-flex min-h-11 items-center gap-1 py-3 font-[family-name:var(--font-poppins)] text-sm font-semibold text-brand-strong focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/cardapio">Ver todos <Icon height={16} name="arrow" width={16} /></Link></div>{featured.length ? <ProductRow ariaLabel="Produtos mais pedidos" className="mt-1">{featured.map((product) => <ProductCard compact key={product.id} product={product} />)}</ProductRow> : <p className="mt-3 rounded-product bg-white p-4 text-sm text-muted">Ainda não há itens disponíveis. Fale com a equipe no balcão.</p>}</section>
    </>}
  </main>;
}
