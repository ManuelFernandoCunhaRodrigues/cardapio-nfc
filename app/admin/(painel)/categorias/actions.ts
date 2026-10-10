'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { swapSortOrders } from '@/lib/admin/reorder';
import { requireAdmin } from '@/lib/admin/require-admin';
import { reportServerError } from '@/lib/observability';
import { createClient } from '@/lib/supabase/server';
import { categoryFormSchema } from '@/lib/validators/category';

import type { CategoryActionState } from './action-state';

function formError(error: z.ZodError): CategoryActionState {
  const fieldErrors = error.issues.reduce<Record<string, string[]>>((result, issue) => {
    const field = issue.path.join('.');
    if (field) result[field] = [...(result[field] ?? []), issue.message];
    return result;
  }, {});
  return { status: 'error', message: 'Revise os campos destacados antes de salvar.', fieldErrors };
}

function catalogPaths(): void {
  revalidatePath('/', 'layout');
  revalidatePath('/admin');
  revalidatePath('/admin/categorias');
  revalidatePath('/admin/produtos');
}

async function audit(actorId: string, action: 'create' | 'update' | 'delete' | 'reorder', entityId: string, metadata: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from('audit_logs').insert({ actor_id: actorId, action, entity: 'category', entity_id: entityId, metadata });
  if (error) reportServerError('category_audit_failed', error);
}

export async function createCategory(_previous: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const parsed = categoryFormSchema.safeParse({ name: formData.get('name'), slug: formData.get('slug'), description: formData.get('description'), is_active: formData.get('is_active') === 'on' });
  if (!parsed.success) return formError(parsed.error);
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };

  try {
    const supabase = await createClient();
    const { data: last } = await supabase.from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const { data, error } = await supabase.from('categories').insert({ ...parsed.data, sort_order: (last?.sort_order ?? -1) + 1 }).select('id').single();
    if (error) {
      if (error.code === '23505') return { status: 'error', message: 'Esse slug já está em uso. Escolha outro.', fieldErrors: { slug: ['Esse slug já está em uso.'] } };
      reportServerError('category_create_failed', error);
      return { status: 'error', message: 'Não foi possível criar a categoria agora. Tente novamente.' };
    }
    await audit(admin.userId, 'create', data.id, { name: parsed.data.name });
    catalogPaths();
    return { status: 'success', message: 'Categoria criada com sucesso.' };
  } catch (error) {
    reportServerError('category_create_exception', error);
    return { status: 'error', message: 'Não foi possível criar a categoria agora. Tente novamente.' };
  }
}

export async function updateCategory(_previous: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const parsed = categoryFormSchema.safeParse({ name: formData.get('name'), slug: formData.get('slug'), description: formData.get('description'), is_active: formData.get('is_active') === 'on' });
  if (!id.success || !parsed.success) return !parsed.success ? formError(parsed.error) : { status: 'error', message: 'Categoria inválida.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('categories').update(parsed.data).eq('id', id.data);
    if (error) {
      if (error.code === '23505') return { status: 'error', message: 'Esse slug já está em uso. Escolha outro.', fieldErrors: { slug: ['Esse slug já está em uso.'] } };
      reportServerError('category_update_failed', error);
      return { status: 'error', message: 'Não foi possível salvar a categoria agora. Tente novamente.' };
    }
    await audit(admin.userId, 'update', id.data, { name: parsed.data.name });
    catalogPaths();
    return { status: 'success', message: 'Categoria atualizada com sucesso.' };
  } catch (error) {
    reportServerError('category_update_exception', error);
    return { status: 'error', message: 'Não foi possível salvar a categoria agora. Tente novamente.' };
  }
}

export async function toggleCategory(_previous: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const active = formData.get('is_active') === 'true';
  if (!id.success) return { status: 'error', message: 'Categoria inválida.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  const supabase = await createClient();
  const { error } = await supabase.from('categories').update({ is_active: active }).eq('id', id.data);
  if (error) { reportServerError('category_toggle_failed', error); return { status: 'error', message: 'Não foi possível atualizar o status da categoria.' }; }
  await audit(admin.userId, 'update', id.data, { is_active: active });
  catalogPaths();
  return { status: 'success', message: active ? 'Categoria ativada.' : 'Categoria desativada.' };
}

export async function reorderCategory(_previous: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const direction = z.enum(['up', 'down']).safeParse(formData.get('direction'));
  if (!id.success || !direction.success) return { status: 'error', message: 'Não foi possível alterar a ordem.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  const supabase = await createClient();
  const { data, error } = await supabase.from('categories').select('id, sort_order').order('sort_order').order('name');
  const pair = error ? null : swapSortOrders(data ?? [], id.data, direction.data);
  if (!pair) return { status: 'error', message: 'Esta categoria já está no limite da lista.' };
  const results = await Promise.all(pair.map((item) => supabase.from('categories').update({ sort_order: item.sort_order }).eq('id', item.id)));
  if (results.some(({ error: updateError }) => updateError)) return { status: 'error', message: 'Não foi possível alterar a ordem agora.' };
  await audit(admin.userId, 'reorder', id.data, { direction: direction.data });
  catalogPaths();
  return { status: 'success', message: 'Ordem da categoria atualizada.' };
}

export async function deleteCategory(_previous: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { status: 'error', message: 'Categoria inválida.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin) return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  const supabase = await createClient();
  const { error } = await supabase.from('categories').delete().eq('id', id.data);
  if (error) {
    if (error.code === '23503') return { status: 'error', message: 'Esta categoria possui produtos vinculados. Mova os produtos para outra categoria ou desative-a.' };
    reportServerError('category_delete_failed', error);
    return { status: 'error', message: 'Não foi possível excluir a categoria agora.' };
  }
  await audit(admin.userId, 'delete', id.data, {});
  catalogPaths();
  return { status: 'success', message: 'Categoria excluída.' };
}
