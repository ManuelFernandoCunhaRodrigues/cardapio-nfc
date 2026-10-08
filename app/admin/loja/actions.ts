'use server';

import { revalidatePath } from 'next/cache';

import { reportServerError } from '@/lib/observability';
import { createClient } from '@/lib/supabase/server';
import { storeSettingsFormSchema } from '@/lib/validators/store-settings';

import type { StoreSettingsActionState } from './action-state';

export async function updateStoreSettings(
  _previousState: StoreSettingsActionState,
  formData: FormData,
): Promise<StoreSettingsActionState> {
  const openingHours = Array.from({ length: 7 }, (_, day) => ({
    day,
    closed: formData.get(`closed-${day}`) === 'on',
    open: formData.get(`open-${day}`),
    close: formData.get(`close-${day}`),
  }));
  const parsed = storeSettingsFormSchema.safeParse({
    name: formData.get('name'), tagline: formData.get('tagline'), address: formData.get('address'),
    maps_url: formData.get('maps_url'), phone: formData.get('phone'), whatsapp: formData.get('whatsapp'),
    instagram: formData.get('instagram'), opening_hours: openingHours,
    status_override: formData.get('status_override'), notice: formData.get('notice'),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.reduce<Record<string, string[]>>((errors, issue) => {
      const field = issue.path.join('.');
      if (field) errors[field] = [...(errors[field] ?? []), issue.message];
      return errors;
    }, {});
    return { status: 'error', message: 'Revise os campos destacados antes de salvar.', fieldErrors };
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { status: 'error', message: 'Sua sessão expirou. Entre novamente para continuar.' };

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role, is_active').eq('id', user.id).maybeSingle();
    if (profileError || profile?.role !== 'admin' || !profile.is_active) {
      return { status: 'error', message: 'Você não possui permissão para alterar os dados da loja.' };
    }

    const { data: updatedSettings, error: updateError } = await supabase
      .from('store_settings').update(parsed.data).eq('id', true).select('id').maybeSingle();
    if (updateError || !updatedSettings) {
      reportServerError('store_settings_update_failed', updateError ?? new Error('store settings row not found'));
      return { status: 'error', message: 'Não foi possível salvar agora. Tente novamente em instantes.' };
    }

    const { error: auditError } = await supabase.from('audit_logs').insert({
      actor_id: user.id, action: 'update', entity: 'store_settings', metadata: { fields: Object.keys(parsed.data) },
    });
    if (auditError) {
      reportServerError('store_settings_audit_failed', auditError);
      return { status: 'error', message: 'Os dados foram salvos, mas não foi possível registrar a auditoria. Avise a administração.' };
    }

    revalidatePath('/admin/loja');
    return { status: 'success', message: 'Dados da loja salvos com sucesso.' };
  } catch (error) {
    reportServerError('store_settings_update_exception', error);
    return { status: 'error', message: 'Não foi possível salvar agora. Tente novamente em instantes.' };
  }
}
