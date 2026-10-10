import { notFound } from 'next/navigation';

import { ProductForm } from '@/components/admin/product-form';
import { getAdminCategories, getAdminProducts } from '@/lib/admin/catalog';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string }> }>) {
  const { id } = await params;
  const { criado } = await searchParams;
  const [categories, products] = await Promise.all([getAdminCategories(), getAdminProducts()]);
  const product = products.find((item) => item.id === id);
  if (!product) notFound();
  return <ProductForm categories={categories} created={criado === '1'} product={product} />;
}
