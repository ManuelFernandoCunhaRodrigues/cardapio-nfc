import { translateDatabaseError } from '../../shared/supabase/database-errors.js';
import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory.js';
import type { SupabaseImageRepository } from '../media/image/image.repository.js';
import type { ProductRecord, ProductRepository } from './products.service.js';

const ADMIN_PRODUCT_COLUMNS =
  'id, category_id, name, slug, description, price_cents, image_path, video_path, badge, sort_order, is_active, is_available, category:categories(name, slug)';

export class SupabaseProductsRepository implements ProductRepository {
  constructor(
    private readonly supabase: AppSupabaseClient,
    private readonly images: SupabaseImageRepository,
  ) {}

  async listForAdmin() {
    const { data, error } = await this.supabase
      .from('products')
      .select(ADMIN_PRODUCT_COLUMNS)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    return data;
  }

  async create(record: ProductRecord) {
    const { data, error } = await this.supabase
      .from('products')
      .insert(record)
      .select('id')
      .single();
    if (error) throw translateDatabaseError(error);
    return data.id;
  }

  async update(id: string, record: ProductRecord) {
    const { data, error } = await this.supabase
      .from('products')
      .update(record)
      .eq('id', id)
      .select('id');
    if (error) throw translateDatabaseError(error);
    return data.length > 0;
  }

  async findCategoryId(id: string) {
    const { data, error } = await this.supabase
      .from('products')
      .select('category_id')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data?.category_id ?? null;
  }

  async setSituation(id: string, fields: { is_active: boolean; is_available: boolean }) {
    const { data, error } = await this.supabase
      .from('products')
      .update(fields)
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async listSortOrders(categoryId: string) {
    const { data, error } = await this.supabase
      .from('products')
      .select('id, sort_order')
      .eq('category_id', categoryId)
      .order('sort_order')
      .order('name');
    if (error) throw error;
    return data;
  }

  async swapSortOrders(sourceId: string, neighborId: string) {
    const { error } = await this.supabase.rpc('swap_product_sort_orders', {
      p_source_id: sourceId,
      p_neighbor_id: neighborId,
    });
    if (error) throw error;
  }

  async delete(id: string) {
    const { data, error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select('image_path, video_path')
      .maybeSingle();
    if (error) throw error;
    return data ? { imagePath: data.image_path, videoPath: data.video_path } : null;
  }

  async isImageInUse(path: string) {
    return this.images.isImageInUse(path);
  }

  async isVideoInUse(path: string) {
    const { data, error } = await this.supabase
      .from('products')
      .select('id')
      .eq('video_path', path)
      .limit(1);
    if (error || data === null) throw error ?? new Error('reference_check_failed');
    return data.length > 0;
  }

  async removeImageFiles(paths: string[]) {
    return this.images.removeFiles('product', paths);
  }

  async removeVideoFile(path: string) {
    const { error } = await this.supabase.storage.from('product-videos').remove([path]);
    if (error) throw error;
  }
}
