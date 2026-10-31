import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory.js';
import type { HighlightInput, HighlightRepository } from './highlights.service.js';
import type { SupabaseImageRepository } from '../media/image/image.repository.js';

const ADMIN_HIGHLIGHT_COLUMNS = 'id, title, description, image_path, target, sort_order, is_active';

export class SupabaseHighlightsRepository implements HighlightRepository {
  constructor(
    private readonly supabase: AppSupabaseClient,
    private readonly images: SupabaseImageRepository,
  ) {}

  async listForAdmin() {
    const { data, error } = await this.supabase
      .from('highlights')
      .select(ADMIN_HIGHLIGHT_COLUMNS)
      .order('sort_order')
      .order('title');
    if (error) throw error;
    return data;
  }

  async create(input: HighlightInput) {
    const { data, error } = await this.supabase
      .from('highlights')
      .insert(input)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async update(id: string, input: HighlightInput) {
    const { data, error } = await this.supabase
      .from('highlights')
      .update(input)
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async setActive(id: string, isActive: boolean) {
    const { data, error } = await this.supabase
      .from('highlights')
      .update({ is_active: isActive })
      .eq('id', id)
      .select('id');
    if (error) throw error;
    return data.length > 0;
  }

  async listSortOrders() {
    const { data, error } = await this.supabase
      .from('highlights')
      .select('id, sort_order')
      .order('sort_order')
      .order('title');
    if (error) throw error;
    return data;
  }

  async swapSortOrders(sourceId: string, neighborId: string) {
    const { error } = await this.supabase.rpc('swap_highlight_sort_orders', {
      p_source_id: sourceId,
      p_neighbor_id: neighborId,
    });
    if (error) throw error;
  }

  async delete(id: string) {
    const { data, error } = await this.supabase
      .from('highlights')
      .delete()
      .eq('id', id)
      .select('image_path')
      .maybeSingle();
    if (error) throw error;
    return data ? { imagePath: data.image_path } : null;
  }

  async isImageInUse(imagePath: string) {
    return this.images.isImageInUse(imagePath);
  }

  async removeImageFiles(filePaths: string[]) {
    return this.images.removeFiles('highlight', filePaths);
  }
}
