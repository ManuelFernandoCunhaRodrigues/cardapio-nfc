import { ProductsManager } from '@/features/products/components/products-manager';
import { getAdminCategories, getAdminProducts } from '@/features/admin/server/catalog';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export default async function ProductsPage() {
  const [categories, products] = await Promise.all([getAdminCategories(), getAdminProducts()]);
  return <ProductsManager categories={categories} products={products} />;
}
