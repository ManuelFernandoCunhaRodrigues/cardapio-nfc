import { notFound } from 'next/navigation';

import { ProductForm } from '@/components/admin/product-form';
import { getAdminCategories, getAdminProducts } from '@/lib/admin/catalog';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const [categories, products] = await Promise.all([getAdminCategories(), getAdminProducts()]);
  const product = products.find((item) => item.id === id);
  if (!product) notFound();
  return <ProductForm categories={categories} product={product} />;
}
