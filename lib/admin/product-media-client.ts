'use client';

import { createProductVideoUpload } from '@/app/admin/(painel)/midia/actions';
import { initialMediaActionState } from '@/app/admin/(painel)/midia/action-state';
import { validateVideoForUpload } from '@/lib/media/client-video';

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
        : reject(new Error('upload_failed'));
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
    throw new Error(signed.message || 'video_prepare_failed');
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
    throw new Error(result.message || 'video_process_failed');
  callbacks.onProgress?.(100);
  callbacks.onMessage?.(result.message ?? 'Vídeo enviado.');
  return result.path;
}

export function friendlyVideoError(error: unknown): string {
  const reason = error instanceof Error ? error.message : '';
  if (reason === 'video_timeout_gateway')
    return 'O preparo demorou mais que o esperado. Tente novamente.';
  if (reason && !['upload_failed', 'video_process_failed', 'video_prepare_failed'].includes(reason))
    return reason;
  return 'Não foi possível enviar o vídeo. Tente novamente.';
}
