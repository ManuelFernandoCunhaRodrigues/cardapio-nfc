'use server';

import { adminApiPaths } from '@salgae/core/contracts/admin-api';

import { readFormText, runAdminAction } from '@/features/admin/server/run-admin-action';
import { adminApi } from '@/lib/api/admin-api-client';
import { invalidateMenuCache } from '@/lib/cache/invalidate-public-cache';
import { refreshAdminList, refreshAdminPanel } from '@/lib/cache/refresh-admin-panel';

import type { HighlightActionState } from './action-state';

function readHighlightForm(formData: FormData) {
  return {
    title: readFormText(formData, 'title'),
    description: readFormText(formData, 'description'),
    target: readFormText(formData, 'target'),
    is_active: formData.get('is_active') === 'on',
  };
}

function refreshAfterHighlightChange(message: string, entityId?: string): HighlightActionState {
  invalidateMenuCache();
  refreshAdminPanel();
  return { status: 'success', message, ...(entityId ? { entityId } : {}) };
}

export async function createHighlight(
  _previous: HighlightActionState,
  formData: FormData,
): Promise<HighlightActionState> {
  return runAdminAction(
    async () => {
      const id = await adminApi().create(adminApiPaths.highlights, readHighlightForm(formData));
      return refreshAfterHighlightChange('Destaque criado com sucesso.', id);
    },
    {
      event: 'highlight_create_failed',
      failureMessage: 'Não foi possível criar o destaque agora.',
    },
  );
}

export async function updateHighlight(
  _previous: HighlightActionState,
  formData: FormData,
): Promise<HighlightActionState> {
  const id = readFormText(formData, 'id');
  return runAdminAction(
    async () => {
      await adminApi().write('PUT', adminApiPaths.highlight(id), readHighlightForm(formData));
      return refreshAfterHighlightChange('Destaque atualizado com sucesso.', id);
    },
    {
      event: 'highlight_update_failed',
      failureMessage: 'Não foi possível salvar o destaque agora.',
    },
  );
}

export async function toggleHighlight(
  _previous: HighlightActionState,
  formData: FormData,
): Promise<HighlightActionState> {
  const id = readFormText(formData, 'id');
  const isActive = formData.get('is_active') === 'true';
  return runAdminAction(
    async () => {
      await adminApi().write('PUT', adminApiPaths.highlightActivation(id), {
        is_active: isActive,
      });
      return refreshAfterHighlightChange(isActive ? 'Destaque visível.' : 'Destaque escondido.');
    },
    {
      event: 'highlight_toggle_failed',
      failureMessage: 'Não foi possível atualizar o status do destaque.',
    },
  );
}

export async function reorderHighlight(
  _previous: HighlightActionState,
  formData: FormData,
): Promise<HighlightActionState> {
  const id = readFormText(formData, 'id');
  const direction = readFormText(formData, 'direction');
  return runAdminAction(
    async () => {
      await adminApi().write('POST', adminApiPaths.highlightOrder(id), { direction });
      // A ordem só aparece na lista; o resto do painel não precisa ser marcado.
      invalidateMenuCache();
      refreshAdminList('highlights');
      return { status: 'success', message: 'Ordem atualizada.' };
    },
    {
      event: 'highlight_reorder_failed',
      failureMessage: 'Não foi possível alterar a ordem agora.',
    },
  );
}

export async function deleteHighlight(
  _previous: HighlightActionState,
  formData: FormData,
): Promise<HighlightActionState> {
  const id = readFormText(formData, 'id');
  return runAdminAction(
    async () => {
      await adminApi().write('DELETE', adminApiPaths.highlight(id));
      return refreshAfterHighlightChange('Destaque excluído.');
    },
    {
      event: 'highlight_delete_failed',
      failureMessage: 'Não foi possível excluir o destaque agora.',
    },
  );
}
