import { SearchResults } from '@/components/menu/search-results';
import { getPublicCategories, getPublicProducts } from '@/lib/menu/get-public-menu';

export const revalidate = 60;

export default async function BuscaPage() {
  const [products, categories] = await Promise.all([getPublicProducts(), getPublicCategories()]);
  return <main className="p-4 pt-1"><h1 className="sr-only">Busca</h1>{products.error || categories.error ? <section className="rounded-card bg-white p-5"><h2 className="disp text-xl font-bold text-ink">Busca indisponível agora</h2><p className="mt-2 text-sm leading-6 text-muted">Tente atualizar em alguns instantes.</p></section> : <SearchResults categories={categories.data} products={products.data} />}</main>;
}
