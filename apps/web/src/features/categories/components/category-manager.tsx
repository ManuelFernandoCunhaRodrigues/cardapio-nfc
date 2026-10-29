'use client';

import { useActionState, useCallback, useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';

import type { CategoryActionState } from '@/features/categories/server/action-state';
import {
  createCategory,
  deleteCategory,
  reorderCategory,
  toggleCategory,
  updateCategory,
} from '@/features/categories/server/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminCategory } from '@/features/admin/server/catalog';
import { slugifyPtBr } from '@/lib/utils/slugify';

import { AdminIcon } from '@/features/admin/components/admin-icon';
import { AdminNotice } from '@/features/admin/components/admin-notice';
import { AdminSheet } from '@/features/admin/components/admin-sheet';
import { ConfirmDialog } from '@/features/admin/components/confirm-dialog';

const INITIAL: CategoryActionState = { status: 'idle' };

function SubmitButton({ editing }: Readonly<{ editing: boolean }>) {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? 'Salvando…' : editing ? 'Salvar categoria' : 'Criar categoria'}
    </Button>
  );
}

function QuickAction({
  action,
  values,
  label,
  icon,
  disabled = false,
}: Readonly<{
  action: (state: CategoryActionState, formData: FormData) => Promise<CategoryActionState>;
  values: Record<string, string>;
  label: string;
  icon?: 'up' | 'down';
  disabled?: boolean;
}>) {
  const [state, formAction] = useActionState(action, INITIAL);
  return (
    <form action={formAction}>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <button
        aria-label={label}
        className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-white px-3 text-xs font-bold text-ink disabled:opacity-40"
        disabled={disabled}
        type="submit"
      >
        {icon ? <AdminIcon name={icon} /> : label}
      </button>
      <span
        aria-live="polite"
        className="sr-only"
        role={state.status === 'error' ? 'alert' : 'status'}
      >
        {state.message}
      </span>
      {state.status === 'error' ? (
        <AdminNotice className="mt-2" kind="error" message={state.message} />
      ) : null}
    </form>
  );
}

function CategoryEditor({
  category,
  onClose,
  onSaved,
}: Readonly<{
  category: AdminCategory | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}>) {
  const editing = Boolean(category);
  const [createState, createAction] = useActionState(createCategory, INITIAL);
  const [updateState, updateAction] = useActionState(updateCategory, INITIAL);
  const state = editing ? updateState : createState;
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [addressEdited, setAddressEdited] = useState(Boolean(category));
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];
  useEffect(() => {
    if (state.status === 'success' && state.message) onSaved(state.message);
  }, [onSaved, state.message, state.status]);
  return (
    <form action={editing ? updateAction : createAction} className="space-y-4" noValidate>
      {category ? <input name="id" type="hidden" value={category.id} /> : null}
      <Input
        error={errorFor('name')}
        label="Nome"
        name="name"
        onChange={(event) => {
          setName(event.target.value);
          if (!addressEdited) setSlug(slugifyPtBr(event.target.value));
        }}
        required
        value={name}
      />
      <Input
        error={errorFor('slug')}
        label="Endereço curto no cardápio"
        name="slug"
        onChange={(event) => {
          setAddressEdited(true);
          setSlug(slugifyPtBr(event.target.value));
        }}
        required
        value={slug}
      />
      <p className="-mt-2 text-xs text-muted">Usado no link direto para esta categoria.</p>
      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-ink" htmlFor="category-description">
          Descrição
        </label>
        <textarea
          className="min-h-24 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:outline-hidden focus:ring-4 focus:ring-brand/20"
          defaultValue={category?.description ?? ''}
          id="category-description"
          maxLength={500}
          name="description"
        />
      </div>
      <label className="flex min-h-11 items-center justify-between rounded-xl border border-border bg-white px-3 text-sm font-bold text-ink">
        Categoria visível
        <input
          className="size-5 accent-green"
          defaultChecked={category?.is_active ?? true}
          name="is_active"
          role="switch"
          type="checkbox"
        />
      </label>
      <AdminNotice kind={state.status === 'error' ? 'error' : 'success'} message={state.message} />
      <SubmitButton editing={editing} />
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
  const [notice, setNotice] = useState<string>();
  const edit = (category: AdminCategory | null) => {
    setSelected(category);
    setOpen(true);
  };
  const onSaved = useCallback((message: string) => {
    setNotice(message);
    setOpen(false);
  }, []);
  return (
    <>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="disp text-2xl font-bold text-ink lg:text-[28px]">Categorias</h1>
          <p className="mt-1 text-sm text-muted">Organize as seções do cardápio.</p>
        </div>
        <Button onClick={() => edit(null)}>
          <AdminIcon className="mr-2" name="plus" />
          Nova
        </Button>
      </header>
      <AdminNotice className="mb-4" message={notice} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category, index) => (
          <article className="rounded-card bg-white p-4 shadow-card" key={category.id}>
            <button
              className="min-h-11 w-full text-left"
              onClick={() => edit(category)}
              type="button"
            >
              <span className="flex items-start justify-between gap-3">
                <span>
                  <strong className="block font-[family-name:var(--font-poppins)] text-lg text-ink">
                    {category.name}
                  </strong>
                  <span className="mt-1 block text-xs text-muted">
                    {category.product_count} {category.product_count === 1 ? 'produto' : 'produtos'}{' '}
                    · posição {index + 1}
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
                description="Se houver produtos nesta categoria, mova-os antes ou apenas esconda a categoria."
                entityId={category.id}
                title={`Excluir ${category.name}?`}
              />
            </div>
          </article>
        ))}
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
    </>
  );
}
