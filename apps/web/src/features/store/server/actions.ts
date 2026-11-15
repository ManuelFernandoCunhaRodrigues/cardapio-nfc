'use server';

import {
  adminApiPaths,
  storeStatusInputSchema,
  type StoreStatusInput,
} from '@salgae/core/contracts/admin-api';

import { buildOpeningHours } from '@/features/admin/rules/panel';
import { readFormText, runAdminAction } from '@/features/admin/server/run-admin-action';
import { adminApi } from '@/lib/api/admin-api-client';
import { invalidateStoreCache } from '@/lib/cache/invalidate-public-cache';
import { refreshAdminPanel } from '@/lib/cache/refresh-admin-panel';

import type { StoreSettingsActionState } from './action-state';

const statusOverrideMessages: Record<StoreStatusInput['status_override'], string> = {
  auto: 'A loja voltou a seguir os horários.',
  open: 'Loja aberta manualmente.',
  closed: 'Loja fechada manualmente.',
};

function readStoreSettingsForm(formData: FormData) {
  const textFields = Object.fromEntries(
    Array.from(formData.entries()).filter(([, value]) => typeof value === 'string'),
  ) as Record<string, string>;
  return {
    name: readFormText(formData, 'name'),
    tagline: readFormText(formData, 'tagline'),
    address: readFormText(formData, 'address'),
    maps_url: readFormText(formData, 'maps_url'),
    phone: readFormText(formData, 'phone'),
    whatsapp: readFormText(formData, 'whatsapp'),
    instagram: readFormText(formData, 'instagram'),
    opening_hours: buildOpeningHours(textFields),
    status_override: readFormText(formData, 'status_override'),
    notice: readFormText(formData, 'notice'),
  };
}

function refreshAfterStoreChange(message: string): StoreSettingsActionState {
  invalidateStoreCache();
  refreshAdminPanel();
  return { status: 'success', message };
}

export async function updateStoreStatusOverride(
  _previousState: StoreSettingsActionState,
  formData: FormData,
): Promise<StoreSettingsActionState> {
  const parsed = storeStatusInputSchema.safeParse({
    status_override: readFormText(formData, 'status_override'),
  });
  if (!parsed.success) return { status: 'error', message: parsed.error.issues[0].message };
  const input = parsed.data;
  return runAdminAction(
    async () => {
      await adminApi().write('PUT', adminApiPaths.storeStatus, input);
      return refreshAfterStoreChange(statusOverrideMessages[input.status_override]);
    },
    {
      event: 'store_status_override_failed',
      failureMessage: 'Não foi possível mudar o estado da loja agora.',
    },
  );
}

export async function updateStoreSettings(
  _previousState: StoreSettingsActionState,
  formData: FormData,
): Promise<StoreSettingsActionState> {
  return runAdminAction(
    async () => {
      await adminApi().write('PUT', adminApiPaths.store, readStoreSettingsForm(formData));
      return refreshAfterStoreChange('Dados da loja salvos com sucesso.');
    },
    {
      event: 'store_settings_update_failed',
      failureMessage: 'Não foi possível salvar agora. Tente novamente em instantes.',
      submitted: formData,
    },
  );
}
