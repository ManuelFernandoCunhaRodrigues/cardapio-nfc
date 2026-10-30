import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory.js';
import type { StoreRepository } from './store.service.js';

const STORE_COLUMNS =
  'id, name, tagline, address, maps_url, phone, whatsapp, instagram, opening_hours, status_override, notice, updated_at';

export class SupabaseStoreRepository implements StoreRepository {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async findPublicSettings() {
    const { data, error } = await this.supabase
      .from('store_settings')
      .select(STORE_COLUMNS)
      .eq('id', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}
