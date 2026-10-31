'use server';

import { adminApiPaths } from '@salgae/core/contracts/admin-api';

import { readFormText, runAdminAction } from '@/features/admin/server/run-admin-action';
import { adminApi } from '@/lib/api/admin-api-client';
import { invalidateMenuCache } from '@/lib/cache/invalidate-public-cache';
import { refreshAdminPanel } from '@/lib/cache/refresh-admin-panel';

import type { ProductActionState } from './action-state';

function readProductForm(formData: FormData) {
  return {
    name: readFormText(formData, 'name'),
    description: readFormText(formData, 'description'),
    price: readFormText(formData, 'price'),
    category_id: readFormText(formData, 'category_id'),
    badge: readFormText(formData, 'badge') || null,
    is_active: formData.get('is_active') === 'on',
    is_available: formData.get('is_available') === 'on',
  };
}

function refreshAfterProductChange(message: string, entityId?: string): ProductActionState {
  invalidateMenuCache(entityId);
  refreshAdminPanel();
  return { status: 'success', message, ...(entityId ? { entityId } : {}) };
}

export async function createProduct(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  return runAdminAction(
    async () => {
      const id = await adminApi().create(adminApiPaths.products, readProductForm(formData));
      return refreshAfterProductChange('Produto criado com sucesso.', id);
    },
    {
      event: 'product_create_failed',
      failureMessage: 'Não foi possível criar o produto agora. Tente novamente.',
    },
  );
}

export async function updateProduct(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = readFormText(formData, 'id');
  return runAdminAction(
    async () => {
      await adminApi().write('PUT', adminApiPaths.product(id), readProductForm(formData));
      return refreshAfterProductChange('Produto atualizado com sucesso.', id);
    },
    {
      event: 'product_update_failed',
      failureMessage: 'Não foi possível salvar o produto agora. Tente novamente.',
    },
  );
}

export async function setProductSituation(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = readFormText(formData, 'id');
  const situation = readFormText(formData, 'situation');
  return runAdminAction(
    async () => {
      await adminApi().write('PUT', adminApiPaths.productSituation(id), { situation });
      return refreshAfterProductChange('Situação do produto atualizada.', id);
    },
    {
      event: 'product_situation_failed',
      failureMessage: 'Não foi possível mudar a situação do produto.',
    },
  );
}

export async function reorderProduct(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = readFormText(formData, 'id');
  const direction = readFormText(formData, 'direction');
  return runAdminAction(
    async () => {
      await adminApi().write('POST', adminApiPaths.productOrder(id), { direction });
      return refreshAfterProductChange('Ordem do produto atualizada.', id);
    },
    {
      event: 'product_reorder_failed',
      failureMessage: 'Não foi possível alterar a ordem agora.',
    },
  );
}

export async function deleteProduct(
  _previous: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  const id = readFormText(formData, 'id');
  return runAdminAction(
    async () => {
      await adminApi().write('DELETE', adminApiPaths.product(id));
      return refreshAfterProductChange('Produto excluído.', id);
    },
    {
      event: 'product_delete_failed',
      failureMessage: 'Não foi possível excluir o produto agora.',
    },
  );
}
