'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';

import type { CategoryActionState } from '@/app/admin/(painel)/categorias/action-state';
import { createCategory, reorderCategory, toggleCategory, updateCategory } from '@/app/admin/(painel)/categorias/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AdminCategory } from '@/lib/admin/catalog';
import { slugifyPtBr } from '@/lib/utils/slugify';

import { ConfirmDialog } from './confirm-dialog';
import { deleteCategory } from '@/app/admin/(painel)/categorias/actions';

const INITIAL: CategoryActionState = { status: 'idle' };

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <Button disabled={pending} type="submit">{pending ? 'Salvando…' : editing ? 'Salvar categoria' : 'Criar categoria'}</Button>;
}

function QuickSubmit({ disabled, label, title }: Readonly<{ disabled: boolean; label: string; title: string }>) {
  const { pending } = useFormStatus();
  return <button aria-label={label} className="grid min-h-11 min-w-11 place-items-center rounded-full border border-border bg-white px-3 text-sm font-bold text-ink hover:bg-surface-inner focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20 disabled:opacity-50" disabled={disabled || pending} title={title} type="submit">{label}</button>;
}

function QuickAction({ action, values, label, disabled = false }: Readonly<{ action: (state: CategoryActionState, formData: FormData) => Promise<CategoryActionState>; values: Record<string, string>; label: string; disabled?: boolean }>) {
  const [state, formAction] = useActionState(action, INITIAL);
  return <form action={formAction} className="inline-flex">
    {Object.entries(values).map(([name, value]) => <input key={name} name={name} type="hidden" value={value} />)}
    <QuickSubmit disabled={disabled} label={label} title={state.message ?? label} />
  </form>;
}

function CategoryEditor({ category, onCancel }: Readonly<{ category: AdminCategory | null; onCancel: () => void }>) {
  const editing = Boolean(category);
  const [createState, createAction] = useActionState(createCategory, INITIAL);
  const [updateState, updateAction] = useActionState(updateCategory, INITIAL);
  const state = editing ? updateState : createState;
  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(category));
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  return <Card className="h-fit" key={category?.id ?? 'new'}>
    <h2 className="disp text-xl font-bold text-ink">{editing ? 'Editar categoria' : 'Nova categoria'}</h2>
    <p className="mt-1 text-sm leading-6 text-muted">O slug é usado nas URLs e pode ser ajustado antes de salvar.</p>
    <form action={editing ? updateAction : createAction} className="mt-5 space-y-4" noValidate>
      {category ? <input name="id" type="hidden" value={category.id} /> : null}
      <Input error={errorFor('name')} label="Nome" name="name" onChange={(event) => { setName(event.target.value); if (!slugEdited) setSlug(slugifyPtBr(event.target.value)); }} required value={name} />
      <Input error={errorFor('slug')} label="Slug" name="slug" onChange={(event) => { setSlugEdited(true); setSlug(slugifyPtBr(event.target.value)); }} required value={slug} />
      <div className="space-y-1.5"><label className="block text-sm font-bold text-ink" htmlFor="category-description">Descrição</label><textarea className="min-h-24 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" defaultValue={category?.description ?? ''} id="category-description" name="description" maxLength={500} /></div>
      <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface-inner px-3 text-sm font-bold text-ink"><input defaultChecked={category?.is_active ?? true} name="is_active" type="checkbox" /> Categoria ativa</label>
      {state.message ? <p aria-live="polite" className={state.status === 'success' ? 'text-sm text-positive' : 'text-sm text-danger'} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}</p> : null}
      <div className="flex flex-wrap gap-3"><SubmitButton editing={editing} />{editing ? <Button onClick={onCancel} type="button" variant="neutral">Cancelar</Button> : null}</div>
    </form>
  </Card>;
}

export function CategoryManager({ categories }: Readonly<{ categories: AdminCategory[] }>) {
  const [selected, setSelected] = useState<AdminCategory | null>(null);
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
    <div className="grid gap-4 sm:grid-cols-2">
      {categories.map((category, index) => <Card className="flex flex-col" key={category.id}>
        <div className="flex items-start justify-between gap-3"><div><h2 className="disp text-lg font-bold text-ink">{category.name}</h2><p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-muted">/{category.slug}</p></div><span className={`rounded-full px-2 py-1 font-mono text-[9px] font-bold tracking-[0.1em] ${category.is_active ? 'bg-positive/10 text-positive' : 'bg-danger/10 text-danger'}`}>{category.is_active ? 'ATIVA' : 'INATIVA'}</span></div>
        <p className="mt-4 text-sm text-muted">{category.product_count} {category.product_count === 1 ? 'produto' : 'produtos'} · posição {category.sort_order + 1}</p>
        <div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => setSelected(category)} variant="neutral">Editar</Button><QuickAction action={toggleCategory} label={category.is_active ? 'Desativar' : 'Ativar'} values={{ id: category.id, is_active: String(!category.is_active) }} /><QuickAction action={reorderCategory} disabled={index === 0} label="↑" values={{ id: category.id, direction: 'up' }} /><QuickAction action={reorderCategory} disabled={index === categories.length - 1} label="↓" values={{ id: category.id, direction: 'down' }} /><ConfirmDialog action={deleteCategory} description="Não é possível desfazer esta ação. Se houver produtos vinculados, mova-os para outra categoria ou desative esta categoria." entityId={category.id} title={`Excluir ${category.name}?`} /></div>
      </Card>)}
      {!categories.length ? <Card><h2 className="disp text-xl font-bold text-ink">Nenhuma categoria ainda</h2><p className="mt-2 text-sm text-muted">Crie a primeira categoria para organizar os produtos do cardápio.</p></Card> : null}
    </div>
    <CategoryEditor category={selected} key={selected?.id ?? 'new'} onCancel={() => setSelected(null)} />
  </div>;
}
