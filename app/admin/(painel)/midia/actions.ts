'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireAdmin } from '@/lib/admin/require-admin';
import { compressImageToWebp } from '@/lib/media/compress';
import { commitStagedMedia, isMediaUnreferenced, mediaObjectPaths } from '@/lib/media/workflow';
import { reportServerError } from '@/lib/observability';
import { createClient } from '@/lib/supabase/server';

import type { MediaActionState } from './action-state';

const idSchema = z.string().uuid();
const videoTypeSchema = z.enum(['video/mp4', 'video/webm']);

function fail(message: string): MediaActionState { return { status: 'error', message }; }
function refreshMediaPaths(productId?: string) {
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/produtos');
  revalidatePath('/admin/destaques');
  if (productId) revalidatePath(`/admin/produtos/${productId}`);
}
function imageFiles(basePath: string): string[] {
  return mediaObjectPaths(basePath);
}
async function audit(actorId: string, action: string, entity: 'product' | 'highlight', entityId: string, metadata: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from('audit_logs').insert({ actor_id: actorId, action, entity, entity_id: entityId, metadata });
  if (error) reportServerError('media_audit_failed', error);
}
async function canDeleteImagePath(path: string, exclude: { table: 'products' | 'highlights'; id: string }) {
  const supabase = await createClient();
  const [products, highlights, categories] = await Promise.all([
    supabase.from('products').select('id').eq('image_path', path).neq('id', exclude.table === 'products' ? exclude.id : '00000000-0000-0000-0000-000000000000').limit(1),
    supabase.from('highlights').select('id').eq('image_path', path).neq('id', exclude.table === 'highlights' ? exclude.id : '00000000-0000-0000-0000-000000000000').limit(1),
    supabase.from('categories').select('id').eq('image_path', path).limit(1),
  ]);
  return isMediaUnreferenced([Boolean(products.data?.length), Boolean(highlights.data?.length), Boolean(categories.data?.length)]);
}
async function cleanupImagePath(bucket: 'product-images' | 'highlight-images', path: string | null, exclude: { table: 'products' | 'highlights'; id: string }) {
  if (!path || !(await canDeleteImagePath(path, exclude))) return;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(bucket).remove(imageFiles(path));
  if (error) reportServerError('media_old_image_cleanup_failed', error);
}
async function uploadImage(bucket: 'product-images' | 'highlight-images', folder: string, id: string, file: FormDataEntryValue | null, table: 'products' | 'highlights', adminId: string): Promise<MediaActionState> {
  if (!(file instanceof File) || file.size === 0) return fail('Escolha uma foto antes de enviar.');
  try {
    const compressed = await compressImageToWebp(Buffer.from(await file.arrayBuffer()));
    const basePath = `${folder}/${id}/${randomUUID()}`;
    const supabase = await createClient();
    const uploadOptions = { contentType: 'image/webp', upsert: false, cacheControl: '31536000' };
    const [detail, card] = await Promise.all([
      supabase.storage.from(bucket).upload(`${basePath}-detail.webp`, compressed.detail, uploadOptions),
      supabase.storage.from(bucket).upload(`${basePath}-card.webp`, compressed.card, uploadOptions),
    ]);
    if (detail.error || card.error) {
      await supabase.storage.from(bucket).remove([`${basePath}-detail.webp`, `${basePath}-card.webp`]);
      reportServerError('media_image_upload_failed', detail.error ?? card.error);
      return fail('Não foi possível enviar a foto agora. Tente novamente.');
    }
    const { data: current, error: currentError } = await supabase.from(table).select('image_path').eq('id', id).single();
    if (currentError || !current) {
      await supabase.storage.from(bucket).remove([`${basePath}-detail.webp`, `${basePath}-card.webp`]);
      return fail('Não foi possível localizar este item. Atualize a página e tente novamente.');
    }
    try {
      await commitStagedMedia({
        commit: async () => { const { error } = await supabase.from(table).update({ image_path: basePath }).eq('id', id); if (error) throw error; },
        rollbackStaged: async () => { await supabase.storage.from(bucket).remove([`${basePath}-detail.webp`, `${basePath}-card.webp`]); },
        cleanupPrevious: async () => { await cleanupImagePath(bucket, current.image_path, { table, id }); },
      });
    } catch (error) {
      reportServerError('media_image_record_update_failed', error);
      return fail('A foto foi validada, mas não pôde ser vinculada ao item. A foto anterior foi mantida.');
    }
    await audit(adminId, 'media_image_replace', table === 'products' ? 'product' : 'highlight', id, { bucket, image_path: basePath });
    refreshMediaPaths(table === 'products' ? id : undefined);
    return { status: 'success', message: 'Foto otimizada e salva com sucesso.', path: basePath };
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (reason === 'image_size_invalid') return fail('A foto deve ter no máximo 15 MB antes da redução.');
    if (reason === 'image_too_small') return fail('Escolha uma foto com pelo menos 400 px no menor lado.');
    if (reason === 'image_invalid') return fail('Este arquivo não é uma imagem válida. Escolha outra foto.');
    reportServerError('media_image_process_exception', error);
    return fail('Não foi possível processar esta foto. Tente outra imagem.');
  }
}

export async function uploadProductImage(_previous: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const productId = idSchema.safeParse(formData.get('product_id'));
  if (!productId.success) return fail('Produto inválido.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  return uploadImage('product-images', 'products', productId.data, formData.get('image'), 'products', admin.userId);
}

export async function removeProductImage(_previous: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const productId = idSchema.safeParse(formData.get('product_id'));
  if (!productId.success) return fail('Produto inválido.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { data: product, error } = await supabase.from('products').select('image_path, video_path').eq('id', productId.data).single();
  if (error || !product) return fail('Não foi possível localizar este produto.');
  if (product.video_path) return fail('Remova o vídeo antes de remover a foto de capa.');
  if (!product.image_path) return fail('Este produto já não tem foto.');
  const { error: updateError } = await supabase.from('products').update({ image_path: null }).eq('id', productId.data);
  if (updateError) return fail('Não foi possível remover a foto agora.');
  await cleanupImagePath('product-images', product.image_path, { table: 'products', id: productId.data });
  await audit(admin.userId, 'media_image_remove', 'product', productId.data, {});
  refreshMediaPaths(productId.data);
  return { status: 'success', message: 'Foto removida.' };
}

export async function uploadHighlightImage(_previous: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const highlightId = idSchema.safeParse(formData.get('highlight_id'));
  if (!highlightId.success) return fail('Destaque inválido.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  return uploadImage('highlight-images', 'highlights', highlightId.data, formData.get('image'), 'highlights', admin.userId);
}

export async function removeHighlightImage(_previous: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const highlightId = idSchema.safeParse(formData.get('highlight_id'));
  if (!highlightId.success) return fail('Destaque inválido.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { data: highlight, error } = await supabase.from('highlights').select('image_path').eq('id', highlightId.data).single();
  if (error || !highlight?.image_path) return fail('Este destaque já não tem foto.');
  const { error: updateError } = await supabase.from('highlights').update({ image_path: null }).eq('id', highlightId.data);
  if (updateError) return fail('Não foi possível remover a foto agora.');
  await cleanupImagePath('highlight-images', highlight.image_path, { table: 'highlights', id: highlightId.data });
  await audit(admin.userId, 'media_image_remove', 'highlight', highlightId.data, {});
  refreshMediaPaths();
  return { status: 'success', message: 'Foto removida.' };
}

export async function createProductVideoUpload(_previous: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const productId = idSchema.safeParse(formData.get('product_id'));
  const mimeType = videoTypeSchema.safeParse(formData.get('mime_type'));
  if (!productId.success || !mimeType.success) return fail('Vídeo inválido. Escolha um arquivo MP4 ou WebM.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { data: product, error } = await supabase.from('products').select('image_path').eq('id', productId.data).single();
  if (error || !product?.image_path) return fail('Salve uma foto de capa antes de enviar o vídeo.');
  const extension = mimeType.data === 'video/mp4' ? 'mp4' : 'webm';
  const path = `products/${productId.data}/${randomUUID()}.${extension}`;
  const { data, error: signedError } = await supabase.storage.from('product-videos').createSignedUploadUrl(path);
  if (signedError || !data) { reportServerError('media_video_signed_upload_failed', signedError); return fail('Não foi possível preparar o envio do vídeo. Tente novamente.'); }
  return { status: 'success', path, signedUrl: data.signedUrl, token: data.token };
}

export async function confirmProductVideoUpload(_previous: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const productId = idSchema.safeParse(formData.get('product_id'));
  const path = z.string().regex(/^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|webm)$/).safeParse(formData.get('path'));
  if (!productId.success || !path.success || !path.data.startsWith(`products/${productId.data}/`)) return fail('Vídeo inválido.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const filename = path.data.split('/').at(-1)!;
  const { data: objects, error: listError } = await supabase.storage.from('product-videos').list(`products/${productId.data}`, { search: filename });
  if (listError || !objects?.some((object) => object.name === filename)) return fail('O envio do vídeo não foi concluído. Tente novamente.');
  const { data: product, error } = await supabase.from('products').select('image_path, video_path').eq('id', productId.data).single();
  if (error || !product?.image_path) return fail('Uma foto de capa é obrigatória para salvar o vídeo.');
  try {
    await commitStagedMedia({
      commit: async () => { const { error: updateError } = await supabase.from('products').update({ video_path: path.data }).eq('id', productId.data); if (updateError) throw updateError; },
      rollbackStaged: async () => { const { error: removeError } = await supabase.storage.from('product-videos').remove([path.data]); if (removeError) reportServerError('media_unlinked_video_cleanup_failed', removeError); },
      cleanupPrevious: async () => {
        if (!product.video_path || product.video_path === path.data) return;
        const { data: references } = await supabase.from('products').select('id').eq('video_path', product.video_path).neq('id', productId.data).limit(1);
        if (!references?.length) { const { error: removeError } = await supabase.storage.from('product-videos').remove([product.video_path]); if (removeError) reportServerError('media_old_video_cleanup_failed', removeError); }
      },
    });
  } catch (error) {
    reportServerError('media_video_record_update_failed', error);
    return fail('O vídeo foi enviado, mas não pôde ser vinculado ao produto. Tente novamente.');
  }
  await audit(admin.userId, 'media_video_replace', 'product', productId.data, { video_path: path.data });
  refreshMediaPaths(productId.data);
  return { status: 'success', message: 'Vídeo salvo com sucesso.', path: path.data };
}

export async function removeProductVideo(_previous: MediaActionState, formData: FormData): Promise<MediaActionState> {
  const productId = idSchema.safeParse(formData.get('product_id'));
  if (!productId.success) return fail('Produto inválido.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { data: product, error } = await supabase.from('products').select('video_path').eq('id', productId.data).single();
  if (error || !product?.video_path) return fail('Este produto já não tem vídeo.');
  const { error: updateError } = await supabase.from('products').update({ video_path: null }).eq('id', productId.data);
  if (updateError) return fail('Não foi possível remover o vídeo agora.');
  const { data: references } = await supabase.from('products').select('id').eq('video_path', product.video_path).neq('id', productId.data).limit(1);
  if (!references?.length) {
    const { error: removeError } = await supabase.storage.from('product-videos').remove([product.video_path]);
    if (removeError) reportServerError('media_video_cleanup_failed', removeError);
  }
  await audit(admin.userId, 'media_video_remove', 'product', productId.data, {});
  refreshMediaPaths(productId.data);
  return { status: 'success', message: 'Vídeo removido.' };
}
