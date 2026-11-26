'use server';

import { adminApiPaths } from '@salgae/core/contracts/admin-api';

import { readFormText, runAdminAction } from '@/features/admin/server/run-admin-action';
import { adminApi } from '@/lib/api/admin-api-client';
import { invalidateMenuCache } from '@/lib/cache/invalidate-public-cache';
import { refreshAdminList, refreshAdminPanel } from '@/lib/cache/refresh-admin-panel';

import type { CategoryActionState } from './action-state';

function readCategoryForm(formData: FormData) {
  return {
    name: readFormText(formData, 'name'),
    slug: readFormText(formData, 'slug'),
    description: readFormText(formData, 'description'),
    is_active: formData.get('is_active') === 'on',
  };
}

function refreshAfterCategoryChange(message: string, entityId?: string): CategoryActionState {
  invalidateMenuCache();
  refreshAdminPanel();
  return { status: 'success', message, ...(entityId ? { entityId } : {}) };
}

export async function createCategory(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  return runAdminAction(
    async () => {
      const id = await adminApi().create(adminApiPaths.categories, readCategoryForm(formData));
      return refreshAfterCategoryChange('Categoria criada com sucesso.', id);
    },
    {
      event: 'category_create_failed',
      failureMessage: 'Não foi possível criar a categoria agora. Tente novamente.',
      submitted: formData,
    },
  );
}

export async function updateCategory(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = readFormText(formData, 'id');
  return runAdminAction(
    async () => {
      await adminApi().write('PUT', adminApiPaths.category(id), readCategoryForm(formData));
      return refreshAfterCategoryChange('Categoria atualizada com sucesso.', id);
    },
    {
      event: 'category_update_failed',
      failureMessage: 'Não foi possível salvar a categoria agora. Tente novamente.',
      submitted: formData,
    },
  );
}

export async function toggleCategory(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = readFormText(formData, 'id');
  const isActive = formData.get('is_active') === 'true';
  return runAdminAction(
    async () => {
      await adminApi().write('PUT', adminApiPaths.categoryActivation(id), { is_active: isActive });
      return refreshAfterCategoryChange(isActive ? 'Categoria visível.' : 'Categoria escondida.');
    },
    {
      event: 'category_toggle_failed',
      failureMessage: 'Não foi possível atualizar o status da categoria.',
    },
  );
}

export async function reorderCategory(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = readFormText(formData, 'id');
  const direction = readFormText(formData, 'direction');
  return runAdminAction(
    async () => {
      await adminApi().write('POST', adminApiPaths.categoryOrder(id), { direction });
      // A ordem só aparece na lista; o resto do painel não precisa ser marcado.
      invalidateMenuCache();
      refreshAdminList('categories');
      return { status: 'success', message: 'Ordem da categoria atualizada.' };
    },
    {
      event: 'category_reorder_failed',
      failureMessage: 'Não foi possível alterar a ordem agora.',
    },
  );
}

export async function deleteCategory(
  _previous: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const id = readFormText(formData, 'id');
  return runAdminAction(
    async () => {
      await adminApi().write('DELETE', adminApiPaths.category(id));
      return refreshAfterCategoryChange('Categoria excluída.');
    },
    {
      event: 'category_delete_failed',
      failureMessage: 'Não foi possível excluir a categoria agora.',
    },
  );
}
