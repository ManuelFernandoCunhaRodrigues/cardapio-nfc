'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/lib/admin/require-admin';
import { buildOpeningHours } from '@/lib/admin/panel';
import { reportServerError } from '@/lib/observability';
import { createClient } from '@/lib/supabase/server';
import { storeSettingsFormSchema } from '@/lib/validators/store-settings';

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
    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_id: admin.userId,
      action: 'update',
      entity: 'store_settings',
      metadata: { status_override: parsed.data },
    });
    if (auditError) reportServerError('store_status_override_audit_failed', auditError);
    revalidatePath('/admin', 'layout');
    revalidatePath('/admin/loja');
    revalidatePath('/', 'layout');
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
  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.reduce<Record<string, string[]>>((errors, issue) => {
      const field = issue.path.join('.');
      if (field) errors[field] = [...(errors[field] ?? []), issue.message];
      return errors;
    }, {});
    return {
      status: 'error',
      message: 'Revise os campos destacados antes de salvar.',
      fieldErrors,
    };
  }
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
    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_id: admin.userId,
      action: 'update',
      entity: 'store_settings',
      metadata: { fields: Object.keys(parsed.data) },
    });
    if (auditError) {
      reportServerError('store_settings_audit_failed', auditError);
      return {
        status: 'error',
        message:
          'Os dados foram salvos, mas não foi possível registrar a auditoria. Avise a administração.',
      };
    }
    revalidatePath('/admin/loja');
    revalidatePath('/', 'layout');
    return { status: 'success', message: 'Dados da loja salvos com sucesso.' };
  } catch (error) {
    reportServerError('store_settings_update_exception', error);
    return {
      status: 'error',
      message: 'Não foi possível salvar agora. Tente novamente em instantes.',
    };
  }
}
