'use client';

import { createProductVideoUpload } from '@/features/media/server/actions';
import { initialMediaActionState } from '@/features/media/server/action-state';
import { validateVideoForUpload } from '@/features/media/client/client-video';
import { friendlyMediaError, MediaUserError } from '@/features/media/client/friendly-media-error';

async function putSignedVideo(
  signedUrl: string,
  file: File,
  mimeType: string,
  onProgress: (value: number) => void,
) {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const uploadUrl = signedUrl.startsWith('http')
      ? signedUrl
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${signedUrl}`;
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', mimeType);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.max(10, Math.round((event.loaded / event.total) * 90)));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(request.status === 413 ? 'upload_too_large' : 'upload_failed'));
    request.onerror = () => reject(new Error('upload_failed'));
    request.send(file);
  });
}

export async function uploadProductVideoFile(
  productId: string,
  file: File,
  callbacks: { onProgress?: (value: number) => void; onMessage?: (message: string) => void } = {},
) {
  callbacks.onProgress?.(5);
  callbacks.onMessage?.('Validando vídeo…');
  const validation = await validateVideoForUpload(file);
  const signedForm = new FormData();
  signedForm.set('product_id', productId);
  signedForm.set('mime_type', validation.mimeType);
  signedForm.set('size', String(file.size));
  const signed = await createProductVideoUpload(initialMediaActionState, signedForm);
  if (signed.status !== 'success' || !signed.signedUrl || !signed.path)
    throw signed.message ? new MediaUserError(signed.message) : new Error('video_prepare_failed');
  callbacks.onMessage?.('Enviando vídeo…');
  await putSignedVideo(signed.signedUrl, file, validation.mimeType, (value) => {
    callbacks.onProgress?.(value);
  });
  callbacks.onProgress?.(95);
  callbacks.onMessage?.('Preparando o vídeo… Não feche esta tela.');
  const response = await fetch('/admin/midia/video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, path: signed.path }),
  });
  if (response.status === 504) throw new Error('video_timeout_gateway');
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) throw new Error('video_timeout_gateway');
  const result = (await response.json()) as { status?: string; message?: string; path?: string };
  if (!response.ok || result.status !== 'success' || !result.path)
    throw result.message ? new MediaUserError(result.message) : new Error('video_process_failed');
  callbacks.onProgress?.(100);
  callbacks.onMessage?.(result.message ?? 'Vídeo enviado.');
  return result.path;
}

export function friendlyVideoError(error: unknown): string {
  return friendlyMediaError(error, 'video');
}
