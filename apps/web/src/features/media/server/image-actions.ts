'use server';

import { adminApiPaths } from '@salgae/core/contracts/admin-api';

import { readFormText, runAdminAction } from '@/features/admin/server/run-admin-action';
import { adminApi } from '@/lib/api/admin-api-client';
import { invalidateMenuCache } from '@/lib/cache/invalidate-public-cache';
import { refreshAdminPanel } from '@/lib/cache/refresh-admin-panel';

import type { MediaActionState } from './action-state';

function refreshAfterImageChange(message: string, productId?: string, path?: string) {
  invalidateMenuCache(productId);
  refreshAdminPanel();
  return { status: 'success' as const, message, ...(path ? { path } : {}) };
}

async function uploadImage(
  path: string,
  file: FormDataEntryValue | null,
  productId?: string,
): Promise<MediaActionState> {
  const body = new FormData();
  if (file instanceof File) body.set('image', file);
  const uploadedPath = await adminApi().upload(path, body);
  return refreshAfterImageChange('Foto otimizada e salva com sucesso.', productId, uploadedPath);
}

export async function uploadProductImage(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const id = readFormText(formData, 'product_id');
  return runAdminAction(
    () => uploadImage(adminApiPaths.productImage(id), formData.get('image'), id),
    {
      event: 'product_image_upload_failed',
      failureMessage: 'Não foi possível processar esta foto. Tente outra imagem.',
    },
  );
}

export async function removeProductImage(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const id = readFormText(formData, 'product_id');
  return runAdminAction(
    async () => {
      await adminApi().write('DELETE', adminApiPaths.productImage(id));
      return refreshAfterImageChange('Foto removida.', id);
    },
    {
      event: 'product_image_remove_failed',
      failureMessage: 'Não foi possível remover a foto agora.',
    },
  );
}

export async function uploadHighlightImage(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const id = readFormText(formData, 'highlight_id');
  return runAdminAction(
    () => uploadImage(adminApiPaths.highlightImage(id), formData.get('image')),
    {
      event: 'highlight_image_upload_failed',
      failureMessage: 'Não foi possível processar esta foto. Tente outra imagem.',
    },
  );
}

export async function removeHighlightImage(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const id = readFormText(formData, 'highlight_id');
  return runAdminAction(
    async () => {
      await adminApi().write('DELETE', adminApiPaths.highlightImage(id));
      return refreshAfterImageChange('Foto removida.');
    },
    {
      event: 'highlight_image_remove_failed',
      failureMessage: 'Não foi possível remover a foto agora.',
    },
  );
}

export async function uploadCategoryImage(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const id = readFormText(formData, 'category_id');
  return runAdminAction(() => uploadImage(adminApiPaths.categoryImage(id), formData.get('image')), {
    event: 'category_image_upload_failed',
    failureMessage: 'Não foi possível processar esta foto. Tente outra imagem.',
  });
}

export async function removeCategoryImage(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const id = readFormText(formData, 'category_id');
  return runAdminAction(
    async () => {
      await adminApi().write('DELETE', adminApiPaths.categoryImage(id));
      return refreshAfterImageChange('Foto removida.');
    },
    {
      event: 'category_image_remove_failed',
      failureMessage: 'Não foi possível remover a foto agora.',
    },
  );
}
