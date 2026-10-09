import { createClient } from '@/lib/supabase/server';

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  sort_order: number;
  is_active: boolean;
  product_count: number;
};

export type AdminProduct = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_path: string | null;
  video_path: string | null;
  badge: 'mais_pedido' | 'novo' | 'quentinho' | null;
  sort_order: number;
  is_active: boolean;
  is_available: boolean;
  category: { name: string; slug: string } | null;
};

export type AdminHighlight = {
  id: string;
  title: string;
  description: string | null;
  image_path: string | null;
  target: string | null;
  sort_order: number;
  is_active: boolean;
};

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_path, sort_order, is_active, products(count)')
    .order('sort_order')
    .order('name');
  if (error) return [];

  return (data ?? []).map((category) => {
    const row = category as unknown as Omit<AdminCategory, 'product_count'> & { products: Array<{ count: number }> };
    return { ...row, product_count: row.products?.[0]?.count ?? 0 };
  });
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, category_id, name, description, price_cents, image_path, video_path, badge, sort_order, is_active, is_available, category:categories(name, slug)')
    .order('sort_order')
    .order('name');
  if (error) return [];
  return (data ?? []) as unknown as AdminProduct[];
}

export async function getAdminHighlights(): Promise<AdminHighlight[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('highlights').select('id, title, description, image_path, target, sort_order, is_active').order('sort_order').order('title');
  return error ? [] : (data ?? []) as AdminHighlight[];
}
