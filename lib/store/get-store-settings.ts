import { reportServerError } from '@/lib/observability';
import { createClient } from '@/lib/supabase/server';
import { storeSettingsSchema, type StoreSettings } from '@/lib/validators/store-settings';

type StoreSettingsClient = {
  from: (table: 'store_settings') => ReturnType<Awaited<ReturnType<typeof createClient>>['from']>;
};

export async function getStoreSettings(client?: StoreSettingsClient): Promise<StoreSettings | null> {
  try {
    const supabase = client ?? await createClient();
    const { data, error } = await supabase
      .from('store_settings')
      .select('id, name, tagline, address, maps_url, phone, whatsapp, instagram, opening_hours, status_override, notice, updated_at')
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
