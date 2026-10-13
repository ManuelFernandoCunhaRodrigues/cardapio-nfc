import { reportServerError } from '@/lib/observability';
import { createPublicClient } from '@/lib/supabase/public';
import { getStoreSettings } from '@/lib/store/get-store-settings';
import { productSchema } from '@/lib/validators/product';

import type { MenuCategory, MenuHighlight, MenuProduct } from './types';

export type PublicDataResult<T> = { data: T; error: false } | { data: null; error: true };

export async function getPublicCategories(): Promise<PublicDataResult<MenuCategory[]>> {
  try {
    const { data, error } = await createPublicClient()
      .from('categories')
      .select('id, name, slug, image_path, sort_order')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return { data: (data ?? []) as MenuCategory[], error: false };
  } catch (error) {
    reportServerError('public_categories_read_failed', error);
    return { data: null, error: true };
  }
}

export async function getPublicProducts(): Promise<PublicDataResult<MenuProduct[]>> {
  try {
    const { data, error } = await createPublicClient()
      .from('products')
      .select(
        'id, category_id, name, description, price_cents, image_path, video_path, badge, sort_order, is_active, is_available',
      )
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    const parsed = productSchema.array().safeParse(data ?? []);
    if (!parsed.success) throw parsed.error;
    return { data: parsed.data, error: false };
  } catch (error) {
    reportServerError('public_products_read_failed', error);
    return { data: null, error: true };
  }
}

export async function getPublicHighlights(): Promise<PublicDataResult<MenuHighlight[]>> {
  try {
    const { data, error } = await createPublicClient()
      .from('highlights')
      .select('id, title, description, image_path, target, sort_order')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return { data: (data ?? []) as MenuHighlight[], error: false };
  } catch (error) {
    reportServerError('public_highlights_read_failed', error);
    return { data: null, error: true };
  }
}

export async function getPublicMenu() {
  const [categories, products, highlights] = await Promise.all([
    getPublicCategories(),
    getPublicProducts(),
    getPublicHighlights(),
  ]);
  return { categories, products, highlights };
}

export async function getPublicStoreSettings() {
  try {
    return await getStoreSettings(createPublicClient());
  } catch (error) {
    reportServerError('public_store_settings_read_failed', error);
    return null;
  }
}
