'use server';

import { randomUUID } from 'crypto';
import { z } from 'zod';

import { revalidateCatalog } from '@/features/admin/server/action-helpers';
import { requireAdmin } from '@/features/auth/server/require-admin';
import {
  ACCEPTED_VIDEO_MIME_TYPES,
  VIDEO_RAW_MAX_BYTES,
} from '@/features/media/server/video/constants';
import { cleanupVideoOrphans } from '@/features/media/server/video/storage-cleanup';
import { reportServerError } from '@/lib/observability';
import { createClient } from '@/lib/supabase/server';

import type { MediaActionState } from './action-state';

const idSchema = z.string().uuid();
const videoTypeSchema = z.enum(ACCEPTED_VIDEO_MIME_TYPES);
const videoSizeSchema = z.coerce.number().int().positive().max(VIDEO_RAW_MAX_BYTES);

function fail(message: string): MediaActionState {
  return { status: 'error', message };
}

function refreshMediaPaths(productId?: string) {
  revalidateCatalog(['produtos', 'destaques'], productId);
}

export async function createProductVideoUpload(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const productId = idSchema.safeParse(formData.get('product_id'));
  const mimeType = videoTypeSchema.safeParse(formData.get('mime_type'));
  const size = videoSizeSchema.safeParse(formData.get('size'));
  if (!productId.success || !mimeType.success)
    return fail('Vídeo inválido. Escolha um arquivo MP4, MOV ou WebM.');
  if (!size.success)
    return fail('O vídeo deve ter no máximo 50 MB. Grave em Full HD (1080p), não em 4K.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from('products')
    .select('image_path')
    .eq('id', productId.data)
    .single();
  if (error || !product?.image_path) return fail('Salve uma foto de capa antes de enviar o vídeo.');
  await cleanupVideoOrphans(supabase, {
    cleanupUploads: true,
    productId: productId.data,
    onError: reportServerError,
  });
  const extension =
    mimeType.data === 'video/webm' ? 'webm' : mimeType.data === 'video/quicktime' ? 'mov' : 'mp4';
  const path = `uploads/${productId.data}_${randomUUID()}.${extension}`;
  const { data, error: signedError } = await supabase.storage
    .from('product-video-uploads')
    .createSignedUploadUrl(path);
  if (signedError || !data) {
    reportServerError('media_video_signed_upload_failed', signedError);
    return fail('Não foi possível preparar o envio do vídeo. Tente novamente.');
  }
  return { status: 'success', path, signedUrl: data.signedUrl, token: data.token };
}

export async function removeProductVideo(
  _previous: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  const productId = idSchema.safeParse(formData.get('product_id'));
  if (!productId.success) return fail('Produto inválido.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { data: product, error } = await supabase
    .from('products')
    .select('video_path')
    .eq('id', productId.data)
    .single();
  if (error || !product?.video_path) return fail('Este produto já não tem vídeo.');
  const { data: updated, error: updateError } = await supabase
    .from('products')
    .update({ video_path: null })
    .eq('id', productId.data)
    .select('id');
  if (updateError || updated?.length !== 1) return fail('Não foi possível remover o vídeo agora.');
  const { data: references, error: referenceError } = await supabase
    .from('products')
    .select('id')
    .eq('video_path', product.video_path)
    .neq('id', productId.data)
    .limit(1);
  if (referenceError || references === null) {
    reportServerError(
      'media_video_reference_check_failed',
      referenceError ?? new Error('media_video_reference_data_missing'),
    );
  } else if (references.length === 0) {
    const { error: removeError } = await supabase.storage
      .from('product-videos')
      .remove([product.video_path]);
    if (removeError) reportServerError('media_video_cleanup_failed', removeError);
  }
  await cleanupVideoOrphans(supabase, {
    productId: productId.data,
    onError: reportServerError,
  });
  refreshMediaPaths(productId.data);
  return { status: 'success', message: 'Vídeo removido.' };
}
