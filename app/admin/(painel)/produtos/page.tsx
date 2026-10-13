import { ProductsManager } from '@/components/admin/products-manager';
import { getAdminCategories, getAdminProducts } from '@/lib/admin/catalog';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const [categories, products] = await Promise.all([getAdminCategories(), getAdminProducts()]);
  return <ProductsManager categories={categories} products={products} />;
}
