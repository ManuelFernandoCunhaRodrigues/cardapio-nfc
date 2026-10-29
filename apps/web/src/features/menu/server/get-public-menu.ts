import { cache } from 'react';

import { reportServerError } from '@/lib/observability';
import { createPublicClient } from '@/lib/supabase/public';
import { getStoreSettings } from '@/features/store/server/get-store-settings';
import { productSchema } from '@/features/products/schemas/product';

import type { MenuCategory, MenuHighlight, MenuProduct } from '@/features/menu/types';

export type PublicDataResult<T> = { data: T; error: false } | { data: null; error: true };
export type PublicProductCategory = Pick<MenuCategory, 'name' | 'slug'>;
export type PublicSitemapProduct = { slug: string; updated_at: string };

export async function getPublicCategories(): Promise<PublicDataResult<MenuCategory[]>> {
  try {
    const { data, error } = await createPublicClient()
      .from('categories')
      .select('id, name, slug, image_path, sort_order')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return { data: data ?? [], error: false };
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
        'id, category_id, name, slug, description, price_cents, image_path, video_path, badge, sort_order, is_active, is_available',
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

export const getPublicProduct = cache(
  async (id: string): Promise<PublicDataResult<MenuProduct | null>> => {
    try {
      const { data, error } = await createPublicClient()
        .from('products')
        .select(
          'id, category_id, name, slug, description, price_cents, image_path, video_path, badge, sort_order, is_active, is_available',
        )
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { data: null, error: false };
      const parsed = productSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;
      return { data: parsed.data, error: false };
    } catch (error) {
      reportServerError('public_product_read_failed', error);
      return { data: null, error: true };
    }
  },
);

export const getPublicProductBySlug = cache(
  async (slug: string): Promise<PublicDataResult<MenuProduct | null>> => {
    try {
      const { data, error } = await createPublicClient()
        .from('products')
        .select(
          'id, category_id, name, slug, description, price_cents, image_path, video_path, badge, sort_order, is_active, is_available',
        )
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { data: null, error: false };
      const parsed = productSchema.safeParse(data);
      if (!parsed.success) throw parsed.error;
      return { data: parsed.data, error: false };
    } catch (error) {
      reportServerError('public_product_by_slug_read_failed', error);
      return { data: null, error: true };
    }
  },
);

export async function getPublicProductsByCategory(
  categoryId: string,
): Promise<PublicDataResult<MenuProduct[]>> {
  try {
    const { data, error } = await createPublicClient()
      .from('products')
      .select(
        'id, category_id, name, slug, description, price_cents, image_path, video_path, badge, sort_order, is_active, is_available',
      )
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    const parsed = productSchema.array().safeParse(data ?? []);
    if (!parsed.success) throw parsed.error;
    return { data: parsed.data, error: false };
  } catch (error) {
    reportServerError('public_category_products_read_failed', error);
    return { data: null, error: true };
  }
}

export async function getPublicProductCategory(
  id: string,
): Promise<PublicDataResult<PublicProductCategory | null>> {
  try {
    const { data, error } = await createPublicClient()
      .from('categories')
      .select('name, slug')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return { data, error: false };
  } catch (error) {
    reportServerError('public_product_category_read_failed', error);
    return { data: null, error: true };
  }
}

export async function getPublicSitemapProducts(): Promise<
  PublicDataResult<PublicSitemapProduct[]>
> {
  try {
    const { data, error } = await createPublicClient()
      .from('products')
      .select('slug, updated_at')
      .eq('is_active', true);
    if (error) throw error;
    return { data: data ?? [], error: false };
  } catch (error) {
    reportServerError('public_sitemap_products_read_failed', error);
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
    return { data: data ?? [], error: false };
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
