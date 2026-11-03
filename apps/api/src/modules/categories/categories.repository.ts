import { translateDatabaseError } from '../../shared/supabase/database-errors';
import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory';
import type { CategoryInput, CategoryRepository } from './categories.service';

const ADMIN_CATEGORY_COLUMNS =
  'id, name, slug, description, image_path, sort_order, is_active, products(count)';

export class SupabaseCategoriesRepository implements CategoryRepository {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async listForAdmin() {
    const { data, error } = await this.supabase
      .from('categories')
      .select(ADMIN_CATEGORY_COLUMNS)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    return data.map(({ products, ...category }) => ({
      ...category,
      product_count: products[0]?.count ?? 0,
    }));
  }

  async create(input: CategoryInput) {
    const { data, error } = await this.supabase
      .from('categories')
      .insert(input)
      .select('id')
      .single();
    if (error) throw translateDatabaseError(error);
    return data.id;
  }

  async update(id: string, input: CategoryInput) {
    const { data, error } = await this.supabase
      .from('categories')
      .update(input)
      .eq('id', id)
      .select('id');
    if (error) throw translateDatabaseError(error);
    return data.length > 0;
  }

  async setActive(id: string, isActive: boolean) {
    const { data, error } = await this.supabase
      .from('categories')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async listSortOrders() {
    const { data, error } = await this.supabase
      .from('categories')
      .select('id, sort_order')
      .order('sort_order')
      .order('name');
    if (error) throw error;
    return data;
  }

  async swapSortOrders(sourceId: string, neighborId: string) {
    const { error } = await this.supabase.rpc('swap_category_sort_orders', {
      p_source_id: sourceId,
      p_neighbor_id: neighborId,
    });
    if (error) throw error;
  }

  async delete(id: string) {
    const { data, error } = await this.supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select('id');
    if (error) throw translateDatabaseError(error);
    return data.length > 0;
  }
}
