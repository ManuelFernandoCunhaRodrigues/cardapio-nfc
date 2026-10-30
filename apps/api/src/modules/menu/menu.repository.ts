import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory.js';
import type { MenuRepository } from './menu.service.js';

const CATEGORY_COLUMNS = 'id, name, slug, image_path, sort_order';
const PRODUCT_COLUMNS =
  'id, category_id, name, slug, description, price_cents, image_path, video_path, badge, sort_order, is_active, is_available';
const HIGHLIGHT_COLUMNS = 'id, title, description, image_path, target, sort_order';

export class SupabaseMenuRepository implements MenuRepository {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async listCategories() {
    const { data, error } = await this.supabase
      .from('categories')
      .select(CATEGORY_COLUMNS)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  }

  async listProducts() {
    return this.listActiveProducts();
  }

  async listHighlights() {
    const { data, error } = await this.supabase
      .from('highlights')
      .select(HIGHLIGHT_COLUMNS)
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return data ?? [];
  }

  async findProductById(id: string) {
    return this.findActiveProduct('id', id);
  }

  async findProductBySlug(slug: string) {
    return this.findActiveProduct('slug', slug);
  }

  async findCategory(id: string) {
    const { data, error } = await this.supabase
      .from('categories')
      .select('name, slug')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async listProductsByCategory(categoryId: string) {
    return this.listActiveProducts(categoryId);
  }

  async listSitemapItems() {
    const { data, error } = await this.supabase
      .from('products')
      .select('slug, updated_at')
      .eq('is_active', true);
    if (error) throw error;
    return data ?? [];
  }

  private async findActiveProduct(column: 'id' | 'slug', value: string) {
    const { data, error } = await this.supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq(column, value)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  private async listActiveProducts(categoryId?: string) {
    let query = this.supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('is_active', true)
      .order('sort_order');
    if (categoryId) query = query.eq('category_id', categoryId);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
