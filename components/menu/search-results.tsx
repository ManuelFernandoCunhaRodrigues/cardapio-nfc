'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { filterMenuProducts } from '@/lib/menu/search';
import type { MenuCategory, MenuProduct } from '@/lib/menu/types';

import { Icon } from './icons';
import { ProductCard } from './product-card';

export function SearchResults({ products, categories }: Readonly<{ products: MenuProduct[]; categories: MenuCategory[] }>) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => filterMenuProducts(products, query), [products, query]);
  const resultLabel = query ? `${results.length || 'Nenhum'} ${results.length === 1 ? 'resultado' : 'resultados'}` : 'Digite o nome de um item ou ingrediente';
  return <>
    <label className="relative block" htmlFor="menu-search"><span className="sr-only">Buscar no cardápio</span><Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-strong" name="search" /><input autoFocus className="min-h-12 w-full rounded-full border-2 border-brand bg-white py-3 pl-11 pr-4 text-sm text-ink shadow-[0_0_0_3px_rgba(230,95,42,0.12)] outline-none placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-brand/20" id="menu-search" onChange={(event) => setQuery(event.target.value)} placeholder="Busque seu salgado favorito" type="search" value={query} /></label>
    <p aria-live="polite" className="mt-3 text-xs text-muted">{resultLabel}</p>
    {results.length ? <div className="mt-3 grid grid-cols-2 gap-3">{results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <><section className="mt-3 rounded-card bg-white px-6 py-7 text-center shadow-card"><span aria-hidden="true" className="mx-auto grid size-16 place-items-center rounded-full bg-surface-inner text-muted"><Icon height={26} name="search" width={26} /></span><h2 className="disp mt-3 text-xl font-semibold text-ink">Nada por aqui</h2><p className="mt-2 text-sm leading-5 text-muted">Não achamos “{query}” no cardápio. Tente outro sabor ou veja tudo o que temos.</p><Link className="mt-5 inline-flex min-h-12 items-center rounded-full bg-brand-strong px-5 font-[family-name:var(--font-poppins)] text-sm font-semibold text-white shadow-brand focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/25" href="/cardapio">Ver cardápio completo</Link></section><nav aria-label="Atalhos de categoria" className="mt-5"><p className="text-sm font-bold text-ink">Ou vá direto para</p><div className="mt-2 flex flex-wrap gap-2">{categories.map((category) => <Link className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-3.5 text-xs font-bold text-ink focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href={`/cardapio#${category.slug}`} key={category.id}>{category.name}</Link>)}</div></nav></>}
  </>;
}
