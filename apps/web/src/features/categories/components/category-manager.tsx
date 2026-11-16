'use client';

import { useActionState, useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as m from 'motion/react-m';

import type { CategoryActionState } from '@/features/categories/server/action-state';
import {
  createCategory,
  deleteCategory,
  reorderCategory,
  toggleCategory,
  updateCategory,
} from '@/features/categories/server/actions';
import { useFocusFirstInvalid } from '@/features/admin/client/use-focus-first-invalid';
import { fieldDefaults } from '@/features/admin/rules/submitted-values';
import { usePhotoAfterSave } from '@/features/media/client/use-photo-after-save';
import { EditorPhotoField, useEditorPhoto } from '@/features/media/components/editor-photo-field';
import { MediaImage } from '@/features/media/components/media-image';
import { getPublicImageVariantUrl } from '@/features/media/rules/media-urls';
import { initialMediaActionState } from '@/features/media/server/action-state';
import { removeCategoryImage, uploadCategoryImage } from '@/features/media/server/image-actions';
import { listReorder } from '@/components/motion/motion-primitives';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminCategory } from '@salgae/core/contracts/admin-api';
import {
  categoryFormMessage,
  categoryNameError,
  categorySlugFor,
} from '@/features/categories/rules/category-form';
import {
  deleteCategoryBlockReason,
  hideCategoryWarning,
} from '@/features/categories/rules/category-impact';

import { AdminIcon } from '@/features/admin/components/admin-icon';
import { AdminNotice } from '@/features/admin/components/admin-notice';
import { EditorSubmitButton } from '@/features/admin/components/editor-submit-button';
import { AdminSheet } from '@/features/admin/components/admin-sheet';
import { ConfirmDialog } from '@/features/admin/components/confirm-dialog';
import { QuickAction, QuickActionGroup } from '@/features/admin/components/quick-action';

const INITIAL: CategoryActionState = { status: 'idle' };

function uploadPhoto(categoryId: string, image: File) {
  const formData = new FormData();
  formData.set('category_id', categoryId);
  formData.set('image', image);
  return uploadCategoryImage(initialMediaActionState, formData);
}

function CategoryEditor({
  category,
  onClose,
  onSaved,
}: Readonly<{
  category: AdminCategory | null;
  onClose: () => void;
  onSaved: (message: string, kind: 'success' | 'error') => void;
}>) {
  const editing = Boolean(category);
  const [createState, createAction] = useActionState(createCategory, INITIAL);
  const [updateState, updateAction] = useActionState(updateCategory, INITIAL);
  const state = editing ? updateState : createState;
  const [name, setName] = useState(category?.name ?? '');
  const photo = useEditorPhoto(
    getPublicImageVariantUrl('product-images', category?.image_path, 'card'),
    'Foto pronta para salvar junto com a categoria.',
  );
  const formRef = useRef<HTMLFormElement>(null);
  const defaults = fieldDefaults(state.values);
  useFocusFirstInvalid(formRef, state);
  const { uploadingPhoto } = usePhotoAfterSave({
    saveState: state,
    file: photo.file,
    upload: uploadPhoto,
    onSaved,
  });
  return (
    <form
      action={editing ? updateAction : createAction}
      className="space-y-4"
      noValidate
      ref={formRef}
    >
      {category ? <input name="id" type="hidden" value={category.id} /> : null}
      <Input
        error={categoryNameError(state.fieldErrors)}
        label="Nome"
        name="name"
        onChange={(event) => setName(event.target.value)}
        required
        value={name}
      />
      <input name="slug" type="hidden" value={categorySlugFor(name, category?.slug ?? null)} />
      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-ink" htmlFor="category-description">
          Descrição
        </label>
        <textarea
          className="min-h-24 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:outline-hidden focus:ring-4 focus:ring-brand/20"
          defaultValue={defaults.text('description', category?.description ?? '')}
          id="category-description"
          maxLength={500}
          name="description"
        />
      </div>
      <label className="flex min-h-11 items-center justify-between rounded-xl border border-border bg-white px-3 text-sm font-bold text-ink">
        Categoria visível
        <input
          className="size-5 accent-green"
          defaultChecked={defaults.checked('is_active', category?.is_active ?? true)}
          name="is_active"
          role="switch"
          type="checkbox"
        />
      </label>
      <EditorPhotoField
        hint="Aparece no círculo da categoria, na tela inicial. Prefira uma foto quadrada."
        photo={photo}
        previewAlt="Prévia da categoria"
        previewShapeClassName="rounded-full"
        removal={
          category
            ? {
                action: removeCategoryImage,
                confirmTitle: 'Remover foto desta categoria?',
                description: 'A categoria volta a mostrar o desenho na tela inicial.',
                entityId: category.id,
                fieldName: 'category_id',
              }
            : null
        }
        title="Foto da categoria"
      />
      {/* O sucesso fecha a gaveta e aparece no aviso da lista; aqui fica só o erro. */}
      <AdminNotice kind="error" message={categoryFormMessage(state)} />
      <EditorSubmitButton
        label={editing ? 'Salvar categoria' : 'Criar categoria'}
        uploadingPhoto={uploadingPhoto}
      />
      {editing ? (
        <Button className="w-full" onClick={onClose} type="button" variant="neutral">
          Cancelar
        </Button>
      ) : null}
    </form>
  );
}

export function CategoryManager({ categories }: Readonly<{ categories: AdminCategory[] }>) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(searchParams.get('nova') === '1');
  const [selected, setSelected] = useState<AdminCategory | null>(null);
  const [notice, setNotice] = useState<{ message: string; kind: 'success' | 'error' }>();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const edit = (category: AdminCategory | null) => {
    setSelected(category);
    setOpen(true);
  };
  const onSaved = useCallback((message: string, kind: 'success' | 'error') => {
    setNotice({
      kind,
      message:
        kind === 'error' ? `Categoria salva, mas a foto não foi enviada. ${message}` : message,
    });
    setOpen(false);
  }, []);
  return (
    <QuickActionGroup>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1
            className="disp text-2xl font-bold text-ink lg:text-[28px]"
            ref={titleRef}
            tabIndex={-1}
          >
            Categorias
          </h1>
          <p className="mt-1 text-sm text-muted">Organize as seções do cardápio.</p>
        </div>
        <Button onClick={() => edit(null)}>
          <AdminIcon className="mr-2" name="plus" />
          Nova
        </Button>
      </header>
      <AdminNotice className="mb-4" kind={notice?.kind ?? 'success'} message={notice?.message} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category, index) => {
          const hideWarning = category.is_active
            ? hideCategoryWarning(category.product_count)
            : null;
          const deleteBlocked = deleteCategoryBlockReason(category.product_count);
          const deleteHintId = `excluir-${category.id}`;
          return (
            <m.article
              {...listReorder}
              className="rounded-card bg-white p-4 shadow-card"
              key={category.id}
            >
              <button
                className="min-h-11 w-full text-left"
                onClick={() => edit(category)}
                type="button"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    {category.image_path ? (
                      <MediaImage
                        alt=""
                        className="size-11 shrink-0 rounded-full"
                        name={category.name}
                        src={getPublicImageVariantUrl(
                          'product-images',
                          category.image_path,
                          'card',
                        )}
                      />
                    ) : null}
                    <span>
                      <strong className="block font-[family-name:var(--font-poppins)] text-lg text-ink">
                        {category.name}
                      </strong>
                      <span className="mt-1 block text-xs text-muted">
                        {category.product_count}{' '}
                        {category.product_count === 1 ? 'produto' : 'produtos'} · posição{' '}
                        {index + 1}
                      </span>
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${category.is_active ? 'bg-green-soft text-green' : 'bg-danger-soft text-danger'}`}
                  >
                    {category.is_active ? 'VISÍVEL' : 'ESCONDIDA'}
                  </span>
                </span>
              </button>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => edit(category)} variant="neutral">
                  <AdminIcon className="mr-2" name="edit" />
                  Editar
                </Button>
                <QuickAction
                  action={toggleCategory}
                  confirm={
                    hideWarning
                      ? {
                          confirmLabel: 'Esconder',
                          description: hideWarning,
                          title: `Esconder ${category.name}?`,
                        }
                      : undefined
                  }
                  label={category.is_active ? 'Esconder' : 'Mostrar'}
                  values={{ id: category.id, is_active: String(!category.is_active) }}
                />
                <QuickAction
                  action={reorderCategory}
                  disabled={index === 0}
                  icon="up"
                  label={`Subir ${category.name}`}
                  values={{ id: category.id, direction: 'up' }}
                />
                <QuickAction
                  action={reorderCategory}
                  disabled={index === categories.length - 1}
                  icon="down"
                  label={`Descer ${category.name}`}
                  values={{ id: category.id, direction: 'down' }}
                />
                <ConfirmDialog
                  action={deleteCategory}
                  description="A categoria sai do painel e do cardápio."
                  disabled={Boolean(deleteBlocked)}
                  entityId={category.id}
                  fallbackFocusRef={titleRef}
                  title={`Excluir ${category.name}?`}
                  triggerDescribedBy={deleteBlocked ? deleteHintId : undefined}
                />
              </div>
              {deleteBlocked ? (
                <p className="mt-2 text-xs text-muted" id={deleteHintId}>
                  {deleteBlocked}
                </p>
              ) : null}
            </m.article>
          );
        })}
        {!categories.length ? (
          <AdminNotice
            kind="info"
            message="Crie a primeira categoria para organizar os produtos."
          />
        ) : null}
      </div>
      <AdminSheet
        onClose={() => setOpen(false)}
        open={open}
        title={selected ? 'Editar categoria' : 'Nova categoria'}
      >
        <CategoryEditor
          category={selected}
          key={selected?.id ?? 'new'}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
        />
      </AdminSheet>
    </QuickActionGroup>
  );
}
