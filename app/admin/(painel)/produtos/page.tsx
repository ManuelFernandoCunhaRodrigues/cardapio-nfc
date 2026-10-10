import { ProductsManager } from '@/components/admin/products-manager';
import { getAdminCategories, getAdminProducts } from '@/lib/admin/catalog';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const [categories, products] = await Promise.all([getAdminCategories(), getAdminProducts()]);
  return <><header className="hidden border-b border-border pb-6 lg:block"><p className="lbl text-positive">Catálogo</p><h1 className="disp mt-2 text-3xl font-extrabold text-ink">Produtos</h1><p className="mt-2 text-sm text-muted">Controle o que aparece e está disponível no cardápio.</p></header><div className="lg:mt-7"><ProductsManager categories={categories} products={products} /></div></>;
}
