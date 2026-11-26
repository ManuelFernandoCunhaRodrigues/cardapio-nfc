import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SearchResults, SearchResultsFallback } from '@/features/menu/components/search-results';
import { getPublicMenu, getPublicStore } from '@/lib/api/public-api-client';
import { getPublicPageMetadata } from '@/lib/seo/public-page-metadata';
import { SEARCH_FEATURED_COUNT } from '@/features/menu/rules/search';
import { selectFeaturedProducts } from '@salgae/core/rules/product-sort';

export const revalidate = 60;
export async function generateMetadata(): Promise<Metadata> {
  return getPublicPageMetadata('search', await getPublicStore());
}

// O termo (?q=) e o foco (?focus=1) são lidos no navegador para a página continuar estática.
export default async function BuscaPage() {
  const { products, categories } = await getPublicMenu();
  return (
    <main className="p-4 pt-1">
      <h1 className="sr-only">Busca</h1>
      <Suspense
        fallback={
          <SearchResultsFallback
            categories={categories}
            featured={selectFeaturedProducts(products, SEARCH_FEATURED_COUNT)}
          />
        }
      >
        <SearchResults categories={categories} products={products} />
      </Suspense>
    </main>
  );
}
