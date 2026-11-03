import type { AppSupabaseClient } from '../../shared/supabase/supabase-client-factory';
import type { StoreRepository, StoreSettingsInput } from './store.service';

const STORE_COLUMNS =
  'id, name, tagline, address, maps_url, phone, whatsapp, instagram, opening_hours, status_override, notice, updated_at';

export class SupabaseStoreRepository implements StoreRepository {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async findSettings() {
    const { data, error } = await this.supabase
      .from('store_settings')
      .select(STORE_COLUMNS)
      .eq('id', true)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async updateSettings(input: Partial<StoreSettingsInput>) {
    const { data, error } = await this.supabase
      .from('store_settings')
      .update(input)
      .eq('id', true)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return data !== null;
  }
}
