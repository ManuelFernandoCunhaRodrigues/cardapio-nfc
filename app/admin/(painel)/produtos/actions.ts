'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { swapSortOrders } from '@/lib/admin/reorder';
import { fieldsFromProductSituation } from '@/lib/admin/panel';
import { requireAdmin } from '@/lib/admin/require-admin';
import { reportServerError } from '@/lib/observability';
import { cleanupVideoOrphans, type VideoCleanupClient } from '@/lib/media/video/storage-cleanup';
import { createClient } from '@/lib/supabase/server';
import { parsePriceBRL } from '@/lib/utils/parse-price';
import { productFormSchema } from '@/lib/validators/product';

import type { ProductActionState } from './action-state';

function formError(error: z.ZodError): ProductActionState {
  const fieldErrors = error.issues.reduce<Record<string, string[]>>((result, issue) => {
    const field = issue.path.join('.');
    if (field) result[field] = [...(result[field] ?? []), issue.message];
    return result;
  }, {});
  return { status: 'error', message: 'Revise os campos destacados antes de salvar.', fieldErrors };
}

function productValues(formData: FormData) {
  const parsed = productFormSchema.safeParse({
    name: formData.get('name'), description: formData.get('description'), price: formData.get('price'),
    category_id: formData.get('category_id'), badge: formData.get('badge') || null,
    is_active: formData.get('is_active') === 'on', is_available: formData.get('is_available') === 'on',
  });
  if (!parsed.success) return { error: formError(parsed.error) };
  const price_cents = parsePriceBRL(parsed.data.price);
  if (price_cents === null) return { error: { status: 'error' as const, message: 'Informe um preço válido, como R$ 8,90.', fieldErrors: { price: ['Informe um preço válido, como R$ 8,90.'] } } };
  return { values: {
    name: parsed.data.name,
    description: parsed.data.description,
    category_id: parsed.data.category_id,
    badge: parsed.data.badge,
    is_active: parsed.data.is_active,
    is_available: parsed.data.is_available,
    price_cents,
  } };
}

function catalogPaths(id?: string): void {
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/produtos');
  if (id) revalidatePath(`/admin/produtos/${id}`);
}

async function audit(actorId: string, action: 'create' | 'update' | 'delete' | 'reorder', entityId: string, metadata: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from('audit_logs').insert({ actor_id: actorId, action, entity: 'product', entity_id: entityId, metadata });
  if (error) reportServerError('product_audit_failed', error);
}

export async function createProduct(_previous: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const result = productValues(formData);
  if (result.error) return result.error;
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  try {
    const supabase = await createClient();
    const { data: last } = await supabase.from('products').select('sort_order').eq('category_id', result.values.category_id).order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase.from('products').insert({ ...result.values, sort_order: (last?.sort_order ?? -1) + 1 }).select('id').single();
    if (error) { reportServerError('product_create_failed', error); return { status: 'error', message: 'Não foi possível criar o produto agora. Tente novamente.' }; }
    await audit(admin.userId, 'create', data.id, { name: result.values.name, category_id: result.values.category_id });
    catalogPaths(data.id);
    return { status: 'success', message: 'Produto criado com sucesso.', entityId: data.id };
  } catch (error) {
    reportServerError('product_create_exception', error);
    return { status: 'error', message: 'Não foi possível criar o produto agora. Tente novamente.' };
  }
}

export async function updateProduct(_previous: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const result = productValues(formData);
  if (!id.success) return { status: 'error', message: 'Produto inválido.' };
  if (result.error) return result.error;
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('products').update(result.values).eq('id', id.data);
    if (error) { reportServerError('product_update_failed', error); return { status: 'error', message: 'Não foi possível salvar o produto agora. Tente novamente.' }; }
    await audit(admin.userId, 'update', id.data, { name: result.values.name, category_id: result.values.category_id });
    catalogPaths(id.data);
    return { status: 'success', message: 'Produto atualizado com sucesso.', entityId: id.data };
  } catch (error) {
    reportServerError('product_update_exception', error);
    return { status: 'error', message: 'Não foi possível salvar o produto agora. Tente novamente.' };
  }
}

export async function toggleProduct(_previous: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const field = z.enum(['is_active', 'is_available']).safeParse(formData.get('field'));
  const value = formData.get('value') === 'true';
  if (!id.success || !field.success) return { status: 'error', message: 'Produto inválido.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  const supabase = await createClient();
  const { error } = await supabase.from('products').update({ [field.data]: value }).eq('id', id.data);
  if (error) { reportServerError('product_toggle_failed', error); return { status: 'error', message: 'Não foi possível atualizar o status do produto.' }; }
  await audit(admin.userId, 'update', id.data, { [field.data]: value });
  catalogPaths(id.data);
  return { status: 'success', message: value ? 'Status do produto atualizado.' : 'Produto atualizado.' };
}

export async function setProductSituation(_previous: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const situation = z.enum(['menu', 'unavailable', 'hidden']).safeParse(formData.get('situation'));
  if (!id.success || !situation.success) return { status: 'error', message: 'Produto inválido.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  const values = fieldsFromProductSituation(situation.data);
  const supabase = await createClient();
  const { error } = await supabase.from('products').update(values).eq('id', id.data);
  if (error) { reportServerError('product_situation_failed', error); return { status: 'error', message: 'Não foi possível mudar a situação do produto.' }; }
  await audit(admin.userId, 'update', id.data, { situation: situation.data, ...values });
  catalogPaths(id.data);
  return { status: 'success', message: 'Situação do produto atualizada.' };
}

export async function reorderProduct(_previous: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const categoryId = z.string().uuid().safeParse(formData.get('category_id'));
  const direction = z.enum(['up', 'down']).safeParse(formData.get('direction'));
  if (!id.success || !categoryId.success || !direction.success) return { status: 'error', message: 'Não foi possível alterar a ordem.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('products').select('id, sort_order').eq('category_id', categoryId.data).order('sort_order').order('name');
  const pair = error ? null : swapSortOrders(data ?? [], id.data, direction.data);
  if (!pair) return { status: 'error', message: 'Este produto já está no limite da categoria.' };
  const results = await Promise.all(pair.map((item) => supabase.from('products').update({ sort_order: item.sort_order }).eq('id', item.id)));
  if (results.some(({ error: updateError }) => updateError)) return { status: 'error', message: 'Não foi possível alterar a ordem agora.' };
  await audit(admin.userId, 'reorder', id.data, { category_id: categoryId.data, direction: direction.data });
  catalogPaths(id.data);
  return { status: 'success', message: 'Ordem do produto atualizada.' };
}

export async function deleteProduct(_previous: ProductActionState, formData: FormData): Promise<ProductActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { status: 'error', message: 'Produto inválido.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  const supabase = await createClient();
  const { data: media } = await supabase.from('products').select('image_path, video_path').eq('id', id.data).single();
  const { error } = await supabase.from('products').delete().eq('id', id.data);
  if (error) { reportServerError('product_delete_failed', error); return { status: 'error', message: 'Não foi possível excluir o produto agora.' }; }
  if (media?.image_path) {
    const [products, highlights, categories] = await Promise.all([
      supabase.from('products').select('id').eq('image_path', media.image_path).limit(1),
      supabase.from('highlights').select('id').eq('image_path', media.image_path).limit(1),
      supabase.from('categories').select('id').eq('image_path', media.image_path).limit(1),
    ]);
    if (!products.data?.length && !highlights.data?.length && !categories.data?.length) {
      const files = /\.[a-z0-9]{2,5}$/i.test(media.image_path) ? [media.image_path] : [`${media.image_path}-detail.webp`, `${media.image_path}-card.webp`];
      const { error: storageError } = await supabase.storage.from('product-images').remove(files);
      if (storageError) reportServerError('product_delete_image_cleanup_failed', storageError);
    }
  }
  if (media?.video_path) {
    const { data: references } = await supabase.from('products').select('id').eq('video_path', media.video_path).limit(1);
    if (!references?.length) {
      const { error: storageError } = await supabase.storage.from('product-videos').remove([media.video_path]);
      if (storageError) reportServerError('product_delete_video_cleanup_failed', storageError);
    }
  }
  await cleanupVideoOrphans(supabase as unknown as VideoCleanupClient, {
    productId: id.data,
    onError: reportServerError,
  });
  await audit(admin.userId, 'delete', id.data, { media_cleanup_checked: true });
  catalogPaths(id.data);
  return { status: 'success', message: 'Produto excluído.' };
}
