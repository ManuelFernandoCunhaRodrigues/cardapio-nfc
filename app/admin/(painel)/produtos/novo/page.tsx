import { ProductForm } from '@/components/admin/product-form';
import { getAdminCategories } from '@/lib/admin/catalog';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() { return <ProductForm categories={await getAdminCategories()} />; }
