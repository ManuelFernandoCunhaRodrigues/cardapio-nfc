import type { Metadata } from 'next';
import { Suspense } from 'react';

import { SearchResults } from '@/features/menu/components/search-results';
import { getPublicMenu, getPublicStore } from '@/lib/api/public-api-client';
import { getPublicPageMetadata } from '@/lib/seo/public-page-metadata';

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
        fallback={<div aria-hidden="true" className="h-12 animate-pulse rounded-full bg-sand" />}
      >
        <SearchResults categories={categories} products={products} />
      </Suspense>
    </main>
  );
}
