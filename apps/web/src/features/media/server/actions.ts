'use server';

import { adminApiPaths } from '@salgae/core/contracts/admin-api';

import { readFormText, runAdminAction } from '@/features/admin/server/run-admin-action';
import { adminApi } from '@/lib/api/admin-api-client';
import { invalidateMenuCache } from '@/lib/cache/invalidate-public-cache';
import { refreshAdminPanel } from '@/lib/cache/refresh-admin-panel';

import type { MediaActionState } from './action-state';

export async function createProductVideoUpload(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const productId = readFormText(formData, 'product_id');
  return runAdminAction(
    async () => ({
      status: 'success' as const,
      ...(await adminApi().prepareVideo(adminApiPaths.productVideoUpload(productId), {
        mimeType: readFormText(formData, 'mime_type'),
        size: Number(readFormText(formData, 'size')),
      })),
    }),
    {
      event: 'product_video_upload_prepare_failed',
      failureMessage: 'Não foi possível preparar o envio do vídeo. Tente novamente.',
    },
  );
}

export async function removeProductVideo(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const productId = readFormText(formData, 'product_id');
  return runAdminAction(
    async () => {
      await adminApi().write('DELETE', adminApiPaths.productVideo(productId));
      invalidateMenuCache(productId);
      refreshAdminPanel();
      return { status: 'success' as const, message: 'Vídeo removido.' };
    },
    {
      event: 'product_video_remove_failed',
      failureMessage: 'Não foi possível remover o vídeo agora.',
    },
  );
}
