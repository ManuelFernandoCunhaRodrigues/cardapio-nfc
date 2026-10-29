'use server';

import { z } from 'zod';

import { formError, revalidateCatalog } from '@/features/admin/server/action-helpers';
import { swapSortOrders } from '@/features/admin/rules/reorder';
import { requireAdmin } from '@/features/auth/server/require-admin';
import { reportServerError } from '@/lib/observability';
import { createClient } from '@/lib/supabase/server';
import { categoryFormSchema } from '@/features/categories/schemas/category';

import type { CategoryActionState } from './action-state';

function catalogPaths(): void {
  revalidateCatalog(['categorias', 'produtos']);
}

export async function createCategory(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const parsed = categoryFormSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    is_active: formData.get('is_active') === 'on',
  });
  if (!parsed.success) return formError<CategoryActionState>(parsed.error);
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin)
    return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('categories').insert(parsed.data);
    if (error) {
      if (error.code === '23505')
        return {
          status: 'error',
          message: 'Esse endereço curto já está em uso. Escolha outro.',
          fieldErrors: { slug: ['Esse endereço curto já está em uso.'] },
        };
      reportServerError('category_create_failed', error);
      return {
        status: 'error',
        message: 'Não foi possível criar a categoria agora. Tente novamente.',
      };
    }
    catalogPaths();
    return { status: 'success', message: 'Categoria criada com sucesso.' };
  } catch (error) {
    reportServerError('category_create_exception', error);
    return {
      status: 'error',
      message: 'Não foi possível criar a categoria agora. Tente novamente.',
    };
  }
}

export async function updateCategory(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const parsed = categoryFormSchema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    description: formData.get('description'),
    is_active: formData.get('is_active') === 'on',
  });
  if (!id.success || !parsed.success)
    return !parsed.success
      ? formError<CategoryActionState>(parsed.error)
      : { status: 'error', message: 'Categoria inválida.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin)
    return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('categories').update(parsed.data).eq('id', id.data);
    if (error) {
      if (error.code === '23505')
        return {
          status: 'error',
          message: 'Esse endereço curto já está em uso. Escolha outro.',
          fieldErrors: { slug: ['Esse endereço curto já está em uso.'] },
        };
      reportServerError('category_update_failed', error);
      return {
        status: 'error',
        message: 'Não foi possível salvar a categoria agora. Tente novamente.',
      };
    }
    catalogPaths();
    return { status: 'success', message: 'Categoria atualizada com sucesso.' };
  } catch (error) {
    reportServerError('category_update_exception', error);
    return {
      status: 'error',
      message: 'Não foi possível salvar a categoria agora. Tente novamente.',
    };
  }
}

export async function toggleCategory(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const active = formData.get('is_active') === 'true';
  if (!id.success) return { status: 'error', message: 'Categoria inválida.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin)
    return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  const supabase = await createClient();
  const { error } = await supabase
    .from('categories')
    .update({ is_active: active })
    .eq('id', id.data);
  if (error) {
    reportServerError('category_toggle_failed', error);
    return { status: 'error', message: 'Não foi possível atualizar o status da categoria.' };
  }
  catalogPaths();
  return { status: 'success', message: active ? 'Categoria ativada.' : 'Categoria desativada.' };
}

export async function reorderCategory(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  const direction = z.enum(['up', 'down']).safeParse(formData.get('direction'));
  if (!id.success || !direction.success)
    return { status: 'error', message: 'Não foi possível alterar a ordem.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin)
    return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('categories')
    .select('id, sort_order')
    .order('sort_order')
    .order('name');
  const pair = error ? null : swapSortOrders(data ?? [], id.data, direction.data);
  if (!pair) return { status: 'error', message: 'Esta categoria já está no limite da lista.' };
  const { error: reorderError } = await supabase.rpc('swap_category_sort_orders', {
    p_source_id: id.data,
    p_neighbor_id: pair[1].id,
  });
  if (reorderError) {
    reportServerError('category_reorder_failed', reorderError);
    return { status: 'error', message: 'Não foi possível alterar a ordem agora.' };
  }
  catalogPaths();
  return { status: 'success', message: 'Ordem da categoria atualizada.' };
}

export async function deleteCategory(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = z.string().uuid().safeParse(formData.get('id'));
  if (!id.success) return { status: 'error', message: 'Categoria inválida.' };
  const admin = await requireAdmin({ redirectUnauthenticated: false });
  if (!admin)
    return { status: 'error', message: 'Sua sessão não permite esta alteração. Entre novamente.' };
  const supabase = await createClient();
  const { error } = await supabase.from('categories').delete().eq('id', id.data);
  if (error) {
    if (error.code === '23503')
      return {
        status: 'error',
        message:
          'Esta categoria possui produtos vinculados. Mova os produtos para outra categoria ou desative-a.',
      };
    reportServerError('category_delete_failed', error);
    return { status: 'error', message: 'Não foi possível excluir a categoria agora.' };
  }
  catalogPaths();
  return { status: 'success', message: 'Categoria excluída.' };
}
