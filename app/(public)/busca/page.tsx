import { SearchResults } from '@/components/menu/search-results';
import { getPublicProducts } from '@/lib/menu/get-public-menu';

export const revalidate = 60;

export default async function BuscaPage() {
  const products = await getPublicProducts();
  return <main className="p-4 pt-6"><h1 className="disp text-2xl font-extrabold text-ink">Busca</h1><p className="mt-1 text-sm text-muted">Encontre pelo sabor ou ingrediente</p>{products.error ? <section className="mt-5 rounded-card bg-cream p-5"><h2 className="disp text-xl font-bold text-ink">Busca indisponível agora</h2><p className="mt-2 text-sm leading-6 text-muted">Tente atualizar em alguns instantes.</p></section> : <div className="mt-5"><SearchResults products={products.data} /></div>}</main>;
}
