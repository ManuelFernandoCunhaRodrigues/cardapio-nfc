import { notFound } from 'next/navigation';

import { ProductForm } from '@/components/admin/product-form';
import { getAdminCategories, getAdminProducts } from '@/lib/admin/catalog';

export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ criado?: string; foto?: string; video?: string }> }>) {
  const { id } = await params;
  const { criado, foto, video } = await searchParams;
  const [categories, products] = await Promise.all([getAdminCategories(), getAdminProducts()]);
  const product = products.find((item) => item.id === id);
  if (!product) notFound();
  const failures = [foto === 'erro' ? 'a foto' : null, video === 'erro' ? 'o vídeo' : null].filter(Boolean);
  const creationWarning = failures.length ? `Produto criado, mas ${failures.join(' e ')} não foi enviado. Tente novamente abaixo.` : undefined;
  return <ProductForm categories={categories} created={criado === '1'} creationWarning={creationWarning} product={product} />;
}
