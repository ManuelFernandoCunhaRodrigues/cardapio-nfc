import { ProductForm } from '@/features/products/components/product-form';
import { getAdminCategories } from '@/features/admin/server/catalog';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  return <ProductForm categories={await getAdminCategories()} />;
}
