'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { formError } from '@/features/admin/server/action-helpers';
import { requireAdmin } from '@/features/auth/server/require-admin';
import { buildOpeningHours } from '@/features/admin/rules/panel';
import { reportServerError } from '@/lib/observability';
import { invalidateStoreCache } from '@/lib/cache/invalidate-public-cache';
import { createClient } from '@/lib/supabase/server';
import { storeSettingsFormSchema } from '@salgae/core/schemas/store-settings';

import type { StoreSettingsActionState } from './action-state';

export async function updateStoreStatusOverride(
  _previousState: StoreSettingsActionState,
  formData: FormData,
): Promise<StoreSettingsActionState> {
  const parsed = z.enum(['auto', 'open', 'closed']).safeParse(formData.get('status_override'));
  if (!parsed.success) return { status: 'error', message: 'Escolha um estado válido para a loja.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin)
    return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('store_settings')
      .update({ status_override: parsed.data })
      .eq('id', true)
      .select('id')
      .maybeSingle();
    if (error || !data) {
      reportServerError(
        'store_status_override_failed',
        error ?? new Error('store settings row not found'),
      );
      return { status: 'error', message: 'Não foi possível mudar o estado da loja agora.' };
    }
    revalidatePath('/admin', 'layout');
    revalidatePath('/admin/loja');
    revalidatePath('/', 'layout');
    invalidateStoreCache();
    return {
      status: 'success',
      message:
        parsed.data === 'auto'
          ? 'A loja voltou a seguir os horários.'
          : parsed.data === 'open'
            ? 'Loja aberta manualmente.'
            : 'Loja fechada manualmente.',
    };
  } catch (error) {
    reportServerError('store_status_override_exception', error);
    return { status: 'error', message: 'Não foi possível mudar o estado da loja agora.' };
  }
}

export async function updateStoreSettings(
  _previousState: StoreSettingsActionState,
  formData: FormData,
): Promise<StoreSettingsActionState> {
  const hourValues = Object.fromEntries(
    Array.from(formData.entries()).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
  const openingHours = buildOpeningHours(hourValues);
  const parsed = storeSettingsFormSchema.safeParse({
    name: formData.get('name'),
    tagline: formData.get('tagline'),
    address: formData.get('address'),
    maps_url: formData.get('maps_url'),
    phone: formData.get('phone'),
    whatsapp: formData.get('whatsapp'),
    instagram: formData.get('instagram'),
    opening_hours: openingHours,
    status_override: formData.get('status_override'),
    notice: formData.get('notice'),
  });
  if (!parsed.success) return formError<StoreSettingsActionState>(parsed.error);
  try {
    const admin = await requireAdmin({ redirectUnauthenticated: false });
    if (!admin)
      return {
        status: 'error',
        message: 'Sua sessão não permite esta alteração. Entre novamente.',
      };
    const supabase = await createClient();
    const { data: updatedSettings, error: updateError } = await supabase
      .from('store_settings')
      .update(parsed.data)
      .eq('id', true)
      .select('id')
      .maybeSingle();
    if (updateError || !updatedSettings) {
      reportServerError(
        'store_settings_update_failed',
        updateError ?? new Error('store settings row not found'),
      );
      return {
        status: 'error',
        message: 'Não foi possível salvar agora. Tente novamente em instantes.',
      };
    }
    revalidatePath('/admin/loja');
    revalidatePath('/', 'layout');
    invalidateStoreCache();
    return { status: 'success', message: 'Dados da loja salvos com sucesso.' };
  } catch (error) {
    reportServerError('store_settings_update_exception', error);
    return {
      status: 'error',
      message: 'Não foi possível salvar agora. Tente novamente em instantes.',
    };
  }
}
