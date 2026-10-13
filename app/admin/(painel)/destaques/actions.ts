'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { swapSortOrders } from '@/lib/admin/reorder';
import { requireAdmin } from '@/lib/admin/require-admin';
import { reportServerError } from '@/lib/observability';
import type { Json } from '@/lib/supabase/database.types';
import { createClient } from '@/lib/supabase/server';
import { highlightFormSchema } from '@/lib/validators/highlight';

import type { HighlightActionState } from './action-state';

function fail(message: string): HighlightActionState {
  return { status: 'error', message };
}
function formError(error: z.ZodError): HighlightActionState {
  const fieldErrors = error.issues.reduce<Record<string, string[]>>((result, issue) => {
    const field = issue.path.join('.');
    if (field) result[field] = [...(result[field] ?? []), issue.message];
    return result;
  }, {});
  return { status: 'error', message: 'Revise os campos destacados antes de salvar.', fieldErrors };
}
function refreshHighlights() {
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/destaques');
}
async function audit(actorId: string, action: string, entityId: string, metadata: Json) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('audit_logs')
    .insert({ actor_id: actorId, action, entity: 'highlight', entity_id: entityId, metadata });
  if (error) reportServerError('highlight_audit_failed', error);
}
function values(formData: FormData) {
  return highlightFormSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    target: formData.get('target'),
    is_active: formData.get('is_active') === 'on',
  });
}

export async function createHighlight(
  _previous: HighlightActionState,
  formData: FormData,
): Promise<HighlightActionState> {
  const parsed = values(formData);
  if (!parsed.success) return formError(parsed.error);
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { data: last } = await supabase
    .from('highlights')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data, error } = await supabase
    .from('highlights')
    .insert({ ...parsed.data, sort_order: (last?.sort_order ?? -1) + 1 })
    .select('id')
    .single();
  if (error) {
    reportServerError('highlight_create_failed', error);
    return fail('Não foi possível criar o destaque agora.');
  }
  await audit(admin.userId, 'create', data.id, { title: parsed.data.title });
  refreshHighlights();
  return { status: 'success', message: 'Destaque criado com sucesso.', entityId: data.id };
}

export async function updateHighlight(
  _previous: HighlightActionState,
  formData: FormData,
): Promise<HighlightActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const parsed = values(formData);
  if (!id.success) return fail('Destaque inválido.');
  if (!parsed.success) return formError(parsed.error);
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { error } = await supabase.from('highlights').update(parsed.data).eq('id', id.data);
  if (error) {
    reportServerError('highlight_update_failed', error);
    return fail('Não foi possível salvar o destaque agora.');
  }
  await audit(admin.userId, 'update', id.data, { title: parsed.data.title });
  refreshHighlights();
  return { status: 'success', message: 'Destaque atualizado com sucesso.', entityId: id.data };
}

export async function toggleHighlight(
  _previous: HighlightActionState,
  formData: FormData,
): Promise<HighlightActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return fail('Destaque inválido.');
  const active = formData.get('is_active') === 'true';
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { error } = await supabase
    .from('highlights')
    .update({ is_active: active })
    .eq('id', id.data);
  if (error) return fail('Não foi possível atualizar o status do destaque.');
  await audit(admin.userId, 'update', id.data, { is_active: active });
  refreshHighlights();
  return { status: 'success', message: active ? 'Destaque ativado.' : 'Destaque desativado.' };
}

export async function reorderHighlight(
  _previous: HighlightActionState,
  formData: FormData,
): Promise<HighlightActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const direction = z.enum(['up', 'down']).safeParse(formData.get('direction'));
  if (!id.success || !direction.success) return fail('Não foi possível alterar a ordem.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('highlights')
    .select('id, sort_order')
    .order('sort_order')
    .order('title');
  const pair = error ? null : swapSortOrders(data ?? [], id.data, direction.data);
  if (!pair) return fail('Este destaque já está no limite da lista.');
  const { error: reorderError } = await supabase.rpc('swap_highlight_sort_orders', {
    p_source_id: id.data,
    p_neighbor_id: pair[1].id,
  });
  if (reorderError) {
    reportServerError('highlight_reorder_failed', reorderError);
    return fail('Não foi possível alterar a ordem agora.');
  }
  await audit(admin.userId, 'reorder', id.data, { direction: direction.data });
  refreshHighlights();
  return { status: 'success', message: 'Ordem atualizada.' };
}

export async function deleteHighlight(
  _previous: HighlightActionState,
  formData: FormData,
): Promise<HighlightActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return fail('Destaque inválido.');
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return fail('Sua sessão não permite esta alteração. Entre novamente.');
  const supabase = await createClient();
  const { data: current } = await supabase
    .from('highlights')
    .select('image_path')
    .eq('id', id.data)
    .single();
  const { error } = await supabase.from('highlights').delete().eq('id', id.data);
  if (error) {
    reportServerError('highlight_delete_failed', error);
    return fail('Não foi possível excluir o destaque agora.');
  }
  if (current?.image_path) {
    const { data: references } = await supabase
      .from('highlights')
      .select('id')
      .eq('image_path', current.image_path)
      .limit(1);
    if (!references?.length) {
      const files = /\.[a-z0-9]{2,5}$/i.test(current.image_path)
        ? [current.image_path]
        : [`${current.image_path}-detail.webp`, `${current.image_path}-card.webp`];
      const { error: storageError } = await supabase.storage.from('highlight-images').remove(files);
      if (storageError) reportServerError('highlight_media_cleanup_failed', storageError);
    }
  }
  await audit(admin.userId, 'delete', id.data, {});
  refreshHighlights();
  return { status: 'success', message: 'Destaque excluído.' };
}
