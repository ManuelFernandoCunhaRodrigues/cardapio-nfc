import {
  adminApiPaths,
  adminCategorySchema,
  adminHighlightSchema,
  type AdminCategory,
  type AdminHighlight,
} from '@salgae/core/contracts/admin-api';

import { adminApi } from '@/lib/api/admin-api-client';
import { createClient } from '@/lib/supabase/server';

export type AdminProduct = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
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

function normalizeBadge(badge: string | null): AdminProduct['badge'] {
  return badge === 'mais_pedido' || badge === 'novo' || badge === 'quentinho' ? badge : null;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  return adminApi().read(adminApiPaths.categories, adminCategorySchema.array());
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, category_id, name, slug, description, price_cents, image_path, video_path, badge, sort_order, is_active, is_available, category:categories(name, slug)',
    )
    .order('sort_order')
    .order('name');
  if (error) return [];
  return (data ?? []).map((product) => ({ ...product, badge: normalizeBadge(product.badge) }));
}

export async function getAdminHighlights(): Promise<AdminHighlight[]> {
  return adminApi().read(adminApiPaths.highlights, adminHighlightSchema.array());
}
