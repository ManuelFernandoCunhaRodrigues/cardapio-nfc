import { Suspense } from 'react';

import { SearchResults } from '@/features/menu/components/search-results';
import { getPublicCategories, getPublicProducts } from '@/features/menu/server/get-public-menu';

export const revalidate = 60;

// O termo (?q=) e o foco (?focus=1) são lidos no navegador para a página continuar estática.
export default async function BuscaPage() {
  const [products, categories] = await Promise.all([getPublicProducts(), getPublicCategories()]);
  return (
    <main className="p-4 pt-1">
      <h1 className="sr-only">Busca</h1>
      {products.error || categories.error ? (
        <section className="rounded-card bg-white p-5">
          <h2 className="disp text-xl font-bold text-ink">Busca indisponível agora</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Tente atualizar em alguns instantes.</p>
        </section>
      ) : (
        <Suspense
          fallback={<div aria-hidden="true" className="h-12 animate-pulse rounded-full bg-sand" />}
        >
          <SearchResults categories={categories.data} products={products.data} />
        </Suspense>
      )}
    </main>
  );
}
