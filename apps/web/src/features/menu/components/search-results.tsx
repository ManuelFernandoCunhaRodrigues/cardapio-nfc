'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';

import { resultPresence } from '@/components/motion/motion-primitives';

import { filterMenuProducts, SEARCH_FEATURED_COUNT } from '@/features/menu/rules/search';
import { selectFeaturedProducts } from '@salgae/core/rules/product-sort';
import type { MenuCategory, MenuProduct } from '@/features/menu/types';

import { Icon } from './icons';
import { ProductCard } from './product-card';

const SEARCH_PLACEHOLDER = 'Busque seu salgado favorito';
const INITIAL_LABEL = 'Escolha uma categoria ou digite o que procura';
const searchFieldClassName =
  'min-h-12 w-full rounded-full border-2 border-brand bg-white py-3 pl-11 pr-4 text-base text-ink shadow-[0_0_0_3px_rgba(230,95,42,0.12)] outline-none placeholder:text-placeholder focus-visible:ring-2 focus-visible:ring-brand/40';
const shortcutClassName =
  'inline-flex min-h-11 items-center rounded-full border border-border bg-white px-3.5 text-xs font-bold text-ink focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/40';

type SearchResultsProps = {
  products: MenuProduct[];
  categories: MenuCategory[];
};

export function SearchResults({ products, categories }: Readonly<SearchResultsProps>) {
  // O termo vem do endereço: é o que o navegador devolve ao voltar do produto.
  const searchParams = useSearchParams();
  const focusOnMount = searchParams.get('focus') === '1';
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const statusRef = useRef<HTMLParagraphElement>(null);
  const effectiveQuery = query.trim();
  const results = useMemo(
    () => filterMenuProducts(products, query, categories),
    [products, query, categories],
  );
  const featured = useMemo(
    () => selectFeaturedProducts(products, SEARCH_FEATURED_COUNT),
    [products],
  );
  const resultLabel = !effectiveQuery
    ? INITIAL_LABEL
    : results.length === 0
      ? 'Nenhum resultado'
      : `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}`;

  useEffect(() => {
    const url = effectiveQuery ? `/busca?q=${encodeURIComponent(effectiveQuery)}` : '/busca';
    if (`${window.location.pathname}${window.location.search}` === url) return;
    // Estado nulo: é assim que o roteador do Next acompanha a troca e devolve este endereço no "voltar".
    window.history.replaceState(null, '', url);
  }, [effectiveQuery]);

  // A busca já filtra enquanto digita: a tecla "Buscar" do teclado do celular só fecha o teclado.
  function closeKeyboard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const field = event.currentTarget.elements.namedItem('q');
    if (field instanceof HTMLInputElement) field.blur();
  }

  // O atalho tocado some da tela; o foco vai para o contador para não voltar ao começo da página.
  function searchCategory(name: string) {
    setQuery(name);
    statusRef.current?.focus();
  }

  return (
    <>
      <form action="/busca" onSubmit={closeKeyboard} role="search">
        <label className="relative block" htmlFor="menu-search">
          <span className="sr-only">Buscar no cardápio</span>
          <Icon
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-strong"
            name="search"
          />
          <input
            autoFocus={focusOnMount}
            className={searchFieldClassName}
            enterKeyHint="search"
            id="menu-search"
            name="q"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            type="search"
            value={query}
          />
        </label>
      </form>
      <p aria-live="polite" className="mt-3 text-xs text-muted" ref={statusRef} tabIndex={-1}>
        {resultLabel}
      </p>
      <AnimatePresence initial={false} mode="wait">
        {!effectiveQuery ? (
          <m.div key="initial-search" {...resultPresence}>
            <InitialSearch
              categories={categories}
              featured={featured}
              onCategory={searchCategory}
            />
          </m.div>
        ) : results.length ? (
          <m.section aria-labelledby="busca-resultados" key="search-results" {...resultPresence}>
            <h2 className="sr-only" id="busca-resultados">
              Resultados
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {results.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </m.section>
        ) : (
          <m.div key="empty-results" {...resultPresence}>
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
            <CategoryShortcuts categories={categories} onCategory={searchCategory} />
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

/**
 * O que a Busca mostra antes do JavaScript. O termo do endereço só é lido no navegador (para a
 * página continuar estática), então o HTML já traz o campo, os atalhos e os mais pedidos.
 */
export function SearchResultsFallback({
  categories,
  featured,
}: Readonly<{ categories: MenuCategory[]; featured: MenuProduct[] }>) {
  return (
    <>
      <div aria-hidden="true" className="relative">
        <Icon
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-strong"
          name="search"
        />
        <div className={`${searchFieldClassName} text-placeholder`}>{SEARCH_PLACEHOLDER}</div>
      </div>
      <p className="mt-3 text-xs text-muted">{INITIAL_LABEL}</p>
      <InitialSearch categories={categories} featured={featured} />
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
  onCategory?: (name: string) => void;
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
}: Readonly<{ categories: MenuCategory[]; onCategory?: (name: string) => void }>) {
  return (
    <nav aria-labelledby="busca-categorias" className="mt-5">
      <h2 className="text-sm font-bold text-ink" id="busca-categorias">
        Categorias
      </h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {categories.map((category) =>
          onCategory ? (
            <button
              className={shortcutClassName}
              key={category.id}
              onClick={() => onCategory(category.name)}
              type="button"
            >
              {category.name}
            </button>
          ) : (
            // Antes do JavaScript o atalho é um link: o termo vai no endereço e a busca o lê depois.
            <Link
              className={shortcutClassName}
              href={`/busca?q=${encodeURIComponent(category.name)}`}
              key={category.id}
            >
              {category.name}
            </Link>
          ),
        )}
      </div>
    </nav>
  );
}
