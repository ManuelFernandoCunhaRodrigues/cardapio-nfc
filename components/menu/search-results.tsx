'use client';

import { useMemo, useState } from 'react';

import { filterMenuProducts } from '@/lib/menu/search';
import type { MenuProduct } from '@/lib/menu/types';

import { Icon } from './icons';
import { ProductCard } from './product-card';

export function SearchResults({ products }: Readonly<{ products: MenuProduct[] }>) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => filterMenuProducts(products, query), [products, query]);
  return <>
    <label className="relative block" htmlFor="menu-search"><span className="sr-only">Buscar no cardápio</span><Icon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" name="search" /><input autoFocus className="min-h-12 w-full rounded-full border border-brand bg-white py-3 pl-11 pr-4 text-sm text-ink shadow-[0_0_0_3px_rgba(230,95,42,0.12)] outline-none placeholder:text-placeholder focus-visible:ring-4 focus-visible:ring-brand/20" id="menu-search" onChange={(event) => setQuery(event.target.value)} placeholder="Busque seu salgado favorito" type="search" value={query} /></label>
    <p aria-live="polite" className="mt-3 text-xs text-muted">{query ? `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}` : 'Digite o nome de um item ou ingrediente'}</p>
    {results.length ? <div className="mt-5 grid grid-cols-2 gap-3">{results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-12 rounded-card border border-dashed border-border bg-cream p-8 text-center"><span aria-hidden="true" className="text-4xl">🍽️</span><h2 className="disp mt-3 text-xl font-bold text-ink">Nada por aqui</h2><p className="mt-2 text-sm leading-6 text-muted">Tente buscar por outro sabor ou confira o cardápio completo.</p></div>}
  </>;
}
