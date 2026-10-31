/* eslint-disable @next/next/no-img-element -- prévia local usa URL blob */
'use client';

import { useActionState, useCallback, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import {
  createHighlight,
  deleteHighlight,
  reorderHighlight,
  toggleHighlight,
  updateHighlight,
} from '@/features/highlights/server/actions';
import {
  initialHighlightActionState,
  type HighlightActionState,
} from '@/features/highlights/server/action-state';
import { removeHighlightImage, uploadHighlightImage } from '@/features/media/server/actions';
import { initialMediaActionState } from '@/features/media/server/action-state';
import { MediaImage } from '@/features/media/components/media-image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminProduct } from '@/features/admin/server/catalog';
import type { AdminCategory, AdminHighlight } from '@salgae/core/contracts/admin-api';
import {
  buildHighlightTarget,
  highlightTargetKind,
  type HighlightTargetKind,
} from '@/features/admin/rules/panel';
import { getPublicImageVariantUrl } from '@/features/media/rules/media-urls';
import { resizeImageForUpload } from '@/features/media/client/client-resize';
import { highlightSummary } from '@/features/menu/rules/highlight-carousel';
import { AdminIcon } from '@/features/admin/components/admin-icon';
import { AdminNotice } from '@/features/admin/components/admin-notice';
import { AdminSheet } from '@/features/admin/components/admin-sheet';
import { ConfirmDialog } from '@/features/admin/components/confirm-dialog';

function SaveButton({ editing }: Readonly<{ editing: boolean }>) {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" disabled={pending} type="submit">
      {pending ? 'Salvando…' : editing ? 'Salvar destaque' : 'Criar destaque'}
    </Button>
  );
}
function QuickAction({
  action,
  values,
  label,
  icon,
}: Readonly<{
  action: (state: HighlightActionState, formData: FormData) => Promise<HighlightActionState>;
  values: Record<string, string>;
  label: string;
  icon?: 'up' | 'down';
}>) {
  const [state, formAction] = useActionState(action, initialHighlightActionState);
  return (
    <form action={formAction}>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <button
        aria-label={label}
        className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-white px-3 text-xs font-bold text-ink"
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
function currentTargetValue(target: string | null, kind: HighlightTargetKind) {
  if (!target) return '';
  if (kind === 'category') return target.slice('/cardapio#'.length);
  if (kind === 'product') return target.slice('/produto/'.length);
  return kind === 'custom' ? target : '';
}

function HighlightEditor({
  highlight,
  categories,
  products,
  onClose,
  onSaved,
}: Readonly<{
  highlight: AdminHighlight | null;
  categories: AdminCategory[];
  products: AdminProduct[];
  onClose: () => void;
  onSaved: (message: string, kind?: 'success' | 'error') => void;
}>) {
  const editing = Boolean(highlight);
  const [createState, createAction] = useActionState(createHighlight, initialHighlightActionState);
  const [updateState, updateAction] = useActionState(updateHighlight, initialHighlightActionState);
  const state = editing ? updateState : createState;
  const initialKind = highlightTargetKind(highlight?.target ?? null);
  const [targetKind, setTargetKind] = useState<HighlightTargetKind>(initialKind);
  const [targetValue, setTargetValue] = useState(
    currentTargetValue(highlight?.target ?? null, initialKind),
  );
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(
    getPublicImageVariantUrl('highlight-images', highlight?.image_path, 'card'),
  );
  const [mediaMessage, setMediaMessage] = useState<string>();
  const uploading = useRef(false);
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];
  useEffect(() => {
    const entityId = state.entityId;
    const savedMessage = state.message;
    if (state.status !== 'success' || !savedMessage) return;
    if (!image) {
      onSaved(savedMessage);
      return;
    }
    if (!entityId || uploading.current) return;
    uploading.current = true;
    void (async () => {
      const formData = new FormData();
      formData.set('highlight_id', entityId);
      formData.set('image', image);
      const result = await uploadHighlightImage(initialMediaActionState, formData);
      setMediaMessage(result.message);
      onSaved(result.message ?? savedMessage, result.status === 'error' ? 'error' : 'success');
    })();
  }, [image, onSaved, state.entityId, state.message, state.status]);
  async function selectImage(file?: File) {
    if (!file) return;
    try {
      const prepared = await resizeImageForUpload(file);
      setImage(prepared);
      setPreview(URL.createObjectURL(prepared));
      setMediaMessage('Foto pronta para salvar junto com o destaque.');
    } catch {
      setMediaMessage('Não foi possível preparar esta foto. Escolha outra.');
    }
  }
  const target = buildHighlightTarget(targetKind, targetValue) ?? '';
  return (
    <form action={editing ? updateAction : createAction} className="space-y-4" noValidate>
      {highlight ? <input name="id" type="hidden" value={highlight.id} /> : null}
      <Input
        defaultValue={highlight?.title ?? ''}
        error={errorFor('title')}
        label="Título"
        maxLength={120}
        name="title"
        required
      />
      <div className="space-y-1.5">
        <label className="block text-sm font-bold text-ink" htmlFor="highlight-description">
          Descrição
        </label>
        <textarea
          className="min-h-24 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:outline-hidden focus:ring-4 focus:ring-brand/20"
          defaultValue={highlight?.description ?? ''}
          id="highlight-description"
          maxLength={600}
          name="description"
        />
      </div>
      <fieldset>
        <legend className="text-sm font-bold text-ink">Para onde o banner leva?</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              ['menu', 'Cardápio inteiro'],
              ['category', 'Uma categoria'],
              ['product', 'Um produto'],
              ['custom', 'Outro endereço'],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-pressed={targetKind === value}
              className={`min-h-11 rounded-xl border px-3 text-sm font-bold ${targetKind === value ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink'}`}
              key={value}
              onClick={() => {
                setTargetKind(value);
                setTargetValue('');
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      {targetKind === 'category' ? (
        <label className="block text-sm font-bold text-ink">
          Escolha a categoria
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-surface-inner px-3 text-sm font-normal"
            onChange={(event) => setTargetValue(event.target.value)}
            value={targetValue}
          >
            <option value="">Selecione</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {targetKind === 'product' ? (
        <label className="block text-sm font-bold text-ink">
          Escolha o produto
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-surface-inner px-3 text-sm font-normal"
            onChange={(event) => setTargetValue(event.target.value)}
            value={targetValue}
          >
            <option value="">Selecione</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {targetKind === 'custom' ? (
        <Input
          label="Endereço completo"
          onChange={(event) => setTargetValue(event.target.value)}
          placeholder="https://exemplo.com"
          type="url"
          value={targetValue}
        />
      ) : null}
      <input name="target" type="hidden" value={target} />
      {errorFor('target') ? <AdminNotice kind="error" message={errorFor('target')} /> : null}
      <label className="flex min-h-11 items-center justify-between rounded-xl border border-border bg-white px-3 text-sm font-bold text-ink">
        Destaque visível
        <input
          className="size-5 accent-green"
          defaultChecked={highlight?.is_active ?? true}
          name="is_active"
          role="switch"
          type="checkbox"
        />
      </label>
      <div>
        <span className="block text-sm font-bold text-ink">Foto do banner</span>
        <div className="mt-2 flex items-center gap-3">
          {preview ? (
            <img
              alt="Prévia do destaque"
              className="size-20 rounded-xl object-cover"
              src={preview}
            />
          ) : (
            <div className="grid size-20 place-items-center rounded-xl bg-surface-inner text-xs text-muted">
              Sem foto
            </div>
          )}
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border bg-white px-4 text-sm font-bold text-ink">
            <input
              accept="image/*"
              className="sr-only"
              onChange={(event) => void selectImage(event.target.files?.[0])}
              type="file"
            />
            Escolher foto
          </label>
        </div>
        {highlight?.image_path ? (
          <div className="mt-2">
            <ConfirmDialog
              action={removeHighlightImage}
              description="A foto deixará de aparecer no banner."
              entityId={highlight.id}
              fieldName="highlight_id"
              onSuccess={() => {
                setPreview(null);
                setMediaMessage('Foto removida.');
              }}
              title="Remover foto deste destaque?"
              triggerLabel="Remover foto"
            />
          </div>
        ) : null}
      </div>
      <AdminNotice kind={state.status === 'error' ? 'error' : 'success'} message={state.message} />
      <AdminNotice kind="info" message={mediaMessage} />
      <SaveButton editing={editing} />
      {editing ? (
        <Button className="w-full" onClick={onClose} variant="neutral">
          Cancelar
        </Button>
      ) : null}
    </form>
  );
}

export function HighlightsManager({
  highlights,
  categories,
  products,
}: Readonly<{
  highlights: AdminHighlight[];
  categories: AdminCategory[];
  products: AdminProduct[];
}>) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(searchParams.get('novo') === '1');
  const [selected, setSelected] = useState<AdminHighlight | null>(null);
  const [notice, setNotice] = useState<{ message: string; kind: 'success' | 'error' }>();
  const summary = highlightSummary(highlights);
  const edit = (highlight: AdminHighlight | null) => {
    setSelected(highlight);
    setOpen(true);
  };
  const onSaved = useCallback((message: string, kind: 'success' | 'error' = 'success') => {
    setNotice({ message, kind });
    setOpen(false);
  }, []);
  return (
    <>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="disp text-2xl font-bold text-ink lg:text-[28px]">Destaques</h1>
          <p className="mt-1 text-sm text-muted">
            {summary.active} ativos de {summary.total}
          </p>
        </div>
        <Button onClick={() => edit(null)}>
          <AdminIcon className="mr-2" name="plus" />
          Novo
        </Button>
      </header>
      <AdminNotice className="mb-4" kind={notice?.kind ?? 'success'} message={notice?.message} />
      {summary.showWarning ? (
        <AdminNotice
          className="mb-4"
          kind="info"
          message="Há mais de 8 destaques ativos. Os últimos podem receber pouca atenção."
        />
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {highlights.map((highlight, index) => (
          <article className="rounded-card bg-white p-4 shadow-card" key={highlight.id}>
            <button
              className="flex min-h-16 w-full gap-3 text-left"
              onClick={() => edit(highlight)}
              type="button"
            >
              <MediaImage
                alt=""
                className="size-16 shrink-0 rounded-xl"
                name={highlight.title}
                src={getPublicImageVariantUrl('highlight-images', highlight.image_path, 'card')}
              />
              <span className="min-w-0 flex-1">
                <span className="sr-only">Editar </span>
                <strong className="block truncate font-[family-name:var(--font-poppins)] text-base text-ink">
                  {highlight.title}
                </strong>
                <span className="mt-1 line-clamp-2 text-xs text-muted">
                  {highlight.description || 'Sem descrição'}
                </span>
                <span
                  className={`mt-2 inline-block rounded-full px-2 py-1 text-[10px] font-bold ${highlight.is_active ? 'bg-green-soft text-green' : 'bg-danger-soft text-danger'}`}
                >
                  {highlight.is_active ? 'VISÍVEL' : 'ESCONDIDO'}
                </span>
              </span>
            </button>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => edit(highlight)} variant="neutral">
                <AdminIcon className="mr-2" name="edit" />
                Editar
              </Button>
              <QuickAction
                action={toggleHighlight}
                label={highlight.is_active ? 'Esconder' : 'Mostrar'}
                values={{ id: highlight.id, is_active: String(!highlight.is_active) }}
              />
              <QuickAction
                action={reorderHighlight}
                icon="up"
                label={`Subir ${highlight.title}`}
                values={{ id: highlight.id, direction: 'up' }}
              />
              <QuickAction
                action={reorderHighlight}
                icon="down"
                label={`Descer ${highlight.title}`}
                values={{ id: highlight.id, direction: 'down' }}
              />
              <ConfirmDialog
                action={deleteHighlight}
                description="O destaque e a foto que só ele usa serão excluídos."
                entityId={highlight.id}
                title={`Excluir ${highlight.title}?`}
              />
            </div>
            <p className="mt-3 text-xs text-muted">Posição {index + 1}</p>
          </article>
        ))}
        {!highlights.length ? (
          <AdminNotice kind="info" message="Crie um destaque para a tela inicial do cardápio." />
        ) : null}
      </div>
      <AdminSheet
        onClose={() => setOpen(false)}
        open={open}
        title={selected ? 'Editar destaque' : 'Novo destaque'}
      >
        <HighlightEditor
          categories={categories}
          highlight={selected}
          key={selected?.id ?? 'new'}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
          products={products}
        />
      </AdminSheet>
    </>
  );
}
