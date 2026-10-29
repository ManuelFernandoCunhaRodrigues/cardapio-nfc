import type { SupabaseClient } from '@supabase/supabase-js';

import { reportServerError } from '@/lib/observability';
import type { Database } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
import { storeSettingsSchema, type StoreSettings } from '@/features/store/schemas/store-settings';

export async function getStoreSettings(
  client?: SupabaseClient<Database>,
): Promise<StoreSettings | null> {
  try {
    const supabase = client ?? (await createClient());
    const { data, error } = await supabase
      .from('store_settings')
      .select(
        'id, name, tagline, address, maps_url, phone, whatsapp, instagram, opening_hours, status_override, notice, updated_at',
      )
      .eq('id', true)
      .maybeSingle();

    if (error || !data) {
      if (error) reportServerError('store_settings_read_failed', error);
      return null;
    }

    const parsed = storeSettingsSchema.safeParse(data);
    if (!parsed.success) {
      reportServerError('store_settings_invalid', parsed.error);
      return null;
    }
    return parsed.data;
  } catch (error) {
    reportServerError('store_settings_read_exception', error);
    return null;
  }
}
