import Link from 'next/link';
import Image from 'next/image';

import { Icon } from '@/components/menu/icons';
import { MediaImage } from '@/components/menu/media-image';
import { ProductCard } from '@/components/menu/product-card';
import { ProductRow } from '@/components/menu/product-row';
import { getPublicImageVariantUrl } from '@/lib/media';
import { getPublicMenu, getPublicStoreSettings } from '@/lib/menu/get-public-menu';
import { sortProductsForHome } from '@/lib/menu/sort';
import { getStoreStatus } from '@/lib/store/opening-hours';

export const revalidate = 60;

const categoryEmoji: Record<string, string> = { coxinhas: '🥟', pasteis: '🥠', porcoes: '🍟', combos: '🍱', drinks: '🥤', doces: '🍫' };

function statusText(settings: Awaited<ReturnType<typeof getPublicStoreSettings>>) {
  if (!settings) return null;
  const status = getStoreStatus(settings, new Date());
  return status.isOpen ? 'Aberta' : 'Fechada';
}

export default async function HomePage() {
  const [menu, settings] = await Promise.all([getPublicMenu(), getPublicStoreSettings()]);
  const menuFailed = menu.categories.error || menu.products.error || menu.highlights.error;
  const products = menu.products.data ?? [];
  const highlights = menu.highlights.data ?? [];
  const featured = sortProductsForHome(products).slice(0, 8);
  const status = statusText(settings);

  return <main className="px-4 pb-6 pt-5">
    <header className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-sm font-semibold text-body">Olá! Bem-vindo à Salgaê 👋</p><Image alt="Salgaê Lanchonete" className="mt-1 h-10 w-auto object-contain object-left" height={940} src="/brand/salgae-logo.webp" width={1671} /><p className="mt-1 font-mono text-[8px] font-semibold tracking-[0.2em] text-muted">SALGADOS QUENTES</p>{status ? <p className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${status === 'Aberta' ? 'bg-positive/10 text-positive' : 'bg-danger/10 text-danger'}`}>{status}</p> : null}</div><Link aria-label="Informações da loja" className="grid size-11 shrink-0 place-items-center rounded-2xl border border-border bg-white text-ink shadow-card focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/info"><Icon name="info" /></Link></header>
    {settings?.notice ? <p className="mt-3 rounded-xl bg-amber/15 px-3 py-2 text-xs font-semibold leading-5 text-body">{settings.notice}</p> : null}
    <Link aria-label="Buscar no cardápio" className="mt-5 flex min-h-12 items-center gap-3 rounded-full border border-border bg-white px-4 text-sm text-placeholder shadow-card transition-colors hover:border-brand focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/busca"><Icon name="search" /><span>Busque seu salgado favorito</span></Link>
    {menuFailed ? <section className="mt-6 rounded-card border border-border bg-cream p-5"><h1 className="disp text-xl font-bold text-ink">O cardápio está dando uma pausa</h1><p className="mt-2 text-sm leading-6 text-muted">Tente atualizar em instantes ou consulte a equipe no balcão.</p></section> : <>
      <section aria-label="Destaques" className="mt-5"><div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">{(highlights.length ? highlights : [{ id: 'default', title: 'SALGADOS QUENTES', description: 'Feitos com carinho para matar a fome.', image_path: null, target: '/cardapio', sort_order: 0 }]).map((highlight) => <article className="relative h-52 min-w-full snap-center overflow-hidden rounded-card bg-[linear-gradient(130deg,#C2491A_0%,#A8441B_55%,#7A2E18_100%)] p-6 text-cream" key={highlight.id}><div className="relative z-10 max-w-[62%]"><p className="font-mono text-[9px] font-semibold tracking-[0.12em]">DESTAQUE DA CASA</p><h1 className="display mt-2 text-[36px] leading-[0.92]">{highlight.title}</h1>{highlight.description ? <p className="mt-3 text-sm leading-5 text-cream">{highlight.description}</p> : null}<Link className="mt-4 inline-flex items-center gap-2 rounded-full bg-cream px-4 py-2 text-xs font-extrabold text-ink focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-white/40" href={highlight.target || '/cardapio'}>Conferir <Icon name="arrow" /></Link></div>{highlight.image_path ? <MediaImage alt="" className="absolute bottom-0 right-0 h-full w-[44%] opacity-90" name={highlight.title} priority sizes="44vw" src={getPublicImageVariantUrl('highlight-images', highlight.image_path, 'detail')} /> : null}</article>)}</div><div aria-hidden="true" className="mt-1 flex justify-center gap-1.5">{(highlights.length ? highlights : [null]).map((_, index) => <span className={`size-1.5 rounded-full ${index === 0 ? 'bg-brand' : 'bg-border'}`} key={index} />)}</div></section>
      <section className="mt-6" aria-labelledby="categorias"><h2 className="sr-only" id="categorias">Categorias</h2><div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">{(menu.categories.data ?? []).map((category) => <Link className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href={`/cardapio#${category.slug}`} key={category.id}><span className="grid size-16 overflow-hidden rounded-full border-2 border-white bg-surface-inner shadow-card">{category.image_path ? <MediaImage alt="" className="h-full w-full" name={category.name} src={getPublicImageVariantUrl('product-images', category.image_path, 'card')} /> : <span aria-hidden="true" className="grid place-items-center text-2xl">{categoryEmoji[category.slug] ?? '🍽️'}</span>}</span><span className="line-clamp-1 text-[11px] font-bold text-ink">{category.name}</span></Link>)}</div></section>
      <section className="mt-7" aria-labelledby="mais-pedidos"><div className="flex items-baseline justify-between"><h2 className="disp text-lg font-bold text-ink" id="mais-pedidos">Mais pedidos</h2><Link className="text-xs font-extrabold text-brand-strong focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/cardapio">Ver todos →</Link></div>{featured.length ? <ProductRow ariaLabel="Produtos mais pedidos" className="mt-3">{featured.map((product) => <ProductCard compact key={product.id} product={product} />)}</ProductRow> : <p className="mt-3 rounded-product bg-cream p-4 text-sm text-muted">Ainda não há itens disponíveis. Fale com a equipe no balcão.</p>}</section>
      {highlights[1] ? <section className="mt-6 overflow-hidden rounded-card bg-[#FFE0C9] p-5"><p className="font-mono text-[9px] font-bold tracking-[0.12em] text-positive">EM DESTAQUE</p><h2 className="disp mt-1 text-2xl font-extrabold text-ink">{highlights[1].title}</h2>{highlights[1].description ? <p className="mt-1 text-sm text-body">{highlights[1].description}</p> : null}<Link className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-cream focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href={highlights[1].target?.startsWith('/') ? highlights[1].target : '/cardapio'}>Conferir <Icon name="arrow" /></Link></section> : null}
    </>}
  </main>;
}
