import Link from 'next/link';

import { ProductCard } from '@/components/menu/product-card';
import { ProductRow } from '@/components/menu/product-row';
import { getPublicCategories, getPublicProducts } from '@/lib/menu/get-public-menu';

export const revalidate = 60;

export default async function CardapioPage() {
  const [categoriesResult, productsResult] = await Promise.all([getPublicCategories(), getPublicProducts()]);
  if (categoriesResult.error || productsResult.error) return <main className="p-4 pt-6"><h1 className="disp text-2xl font-extrabold text-ink">Cardápio</h1><section className="mt-5 rounded-card border border-border bg-cream p-5"><h2 className="disp text-xl font-bold text-ink">Não foi possível carregar agora</h2><p className="mt-2 text-sm leading-6 text-muted">Atualize a página em alguns instantes ou consulte a equipe no balcão.</p></section></main>;
  const categories = categoriesResult.data;
  const products = productsResult.data;
  return <main className="pb-6"><header className="px-4 pt-6"><h1 className="disp text-2xl font-extrabold text-ink">Cardápio</h1><p className="mt-1 text-sm text-muted">Escolha o que deu vontade</p></header><nav aria-label="Categorias do cardápio" className="sticky top-0 z-20 mt-4 border-y border-border/80 bg-white/95 py-3 backdrop-blur"><div className="flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]">{categories.map((category) => <Link className="shrink-0 rounded-full border border-border bg-surface-inner px-3 py-2 text-xs font-bold text-ink transition-colors hover:border-brand hover:text-brand-strong focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href={`#${category.slug}`} key={category.id}>{category.name}</Link>)}</div></nav><div className="space-y-8 px-4 pt-6">{categories.length === 0 ? <p className="rounded-card bg-cream p-5 text-sm text-muted">O cardápio está em preparação. Consulte a equipe no balcão.</p> : categories.map((category) => { const items = products.filter((product) => product.category_id === category.id); return <section className="scroll-mt-20" id={category.slug} key={category.id}><h2 className="disp text-xl font-bold text-ink">{category.name}</h2>{items.length ? <ProductRow ariaLabel={`Produtos de ${category.name}`} className="mt-3">{items.map((product) => <ProductCard compact key={product.id} product={product} />)}</ProductRow> : <p className="mt-3 rounded-product bg-cream p-4 text-sm text-muted">Ainda não há itens nesta categoria.</p>}</section>; })}</div></main>;
}
