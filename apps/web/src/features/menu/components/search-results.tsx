'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { filterMenuProducts } from '@/features/menu/rules/search';
import { sortProductsForHome } from '@/features/menu/rules/sort';
import type { MenuCategory, MenuProduct } from '@/features/menu/types';

import { Icon } from './icons';
import { ProductCard } from './product-card';

type SearchResultsProps = {
  products: MenuProduct[];
  categories: MenuCategory[];
};

export function SearchResults({ products, categories }: Readonly<SearchResultsProps>) {
  // O termo vem do endereço: é o que o navegador devolve ao voltar do produto.
  const searchParams = useSearchParams();
  const focusOnMount = searchParams.get('focus') === '1';
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const results = useMemo(
    () => filterMenuProducts(products, query, categories),
    [products, query, categories],
  );
  const featured = useMemo(() => sortProductsForHome(products).slice(0, 4), [products]);
  const resultLabel = !query
    ? 'Escolha uma categoria ou digite o que procura'
    : results.length === 0
      ? 'Nenhum resultado'
      : `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`;

  useEffect(() => {
    const url = query ? `/busca?q=${encodeURIComponent(query)}` : '/busca';
    if (`${window.location.pathname}${window.location.search}` === url) return;
    // Estado nulo: é assim que o roteador do Next acompanha a troca e devolve este endereço no "voltar".
    window.history.replaceState(null, '', url);
  }, [query]);

  return (
    <>
      <label className="relative block" htmlFor="menu-search">
        <span className="sr-only">Buscar no cardápio</span>
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-strong"
          name="search"
        />
        <input
          autoFocus={focusOnMount}
          className="min-h-12 w-full rounded-full border-2 border-brand bg-white py-3 pl-11 pr-4 text-base text-ink shadow-[0_0_0_3px_rgba(230,95,42,0.12)] outline-none placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-brand/40"
          id="menu-search"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busque seu salgado favorito"
          type="search"
          value={query}
        />
      </label>
      <p aria-live="polite" className="mt-3 text-xs text-muted">
        {resultLabel}
      </p>
      {!query ? (
        <InitialSearch categories={categories} featured={featured} onCategory={setQuery} />
      ) : results.length ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <>
          <section className="mt-3 rounded-card bg-white px-6 py-7 text-center shadow-card">
            <span
              aria-hidden="true"
              className="mx-auto grid size-16 place-items-center rounded-full bg-surface-inner text-muted"
            >
              <Icon height={26} name="search" width={26} />
            </span>
            <h2 className="disp mt-3 text-xl font-semibold text-ink">Nada por aqui</h2>
            <p className="mt-2 text-sm leading-5 text-muted">
              Não achamos “{query}” no cardápio. Tente outro sabor ou veja tudo o que temos.
            </p>
            <Link
              className="mt-5 inline-flex min-h-12 items-center rounded-full bg-brand-strong px-5 font-[family-name:var(--font-poppins)] text-sm font-semibold text-white shadow-brand focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40"
              href="/cardapio"
            >
              Ver cardápio completo
            </Link>
          </section>
          <CategoryShortcuts categories={categories} onCategory={setQuery} />
        </>
      )}
    </>
  );
}

function InitialSearch({
  categories,
  featured,
  onCategory,
}: Readonly<{
  categories: MenuCategory[];
  featured: MenuProduct[];
  onCategory: (name: string) => void;
}>) {
  return (
    <>
      <CategoryShortcuts categories={categories} onCategory={onCategory} />
      {featured.length ? (
        <section className="mt-6" aria-labelledby="busca-mais-pedidos">
          <h2 className="disp text-lg font-semibold text-ink" id="busca-mais-pedidos">
            Mais pedidos
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function CategoryShortcuts({
  categories,
  onCategory,
}: Readonly<{ categories: MenuCategory[]; onCategory: (name: string) => void }>) {
  return (
    <nav aria-label="Atalhos de categoria" className="mt-5">
      <p className="text-sm font-bold text-ink">Categorias</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-3.5 text-xs font-bold text-ink focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40"
            key={category.id}
            onClick={() => onCategory(category.name)}
            type="button"
          >
            {category.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
