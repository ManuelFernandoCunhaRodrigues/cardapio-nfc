'use client';

import { useActionState, useCallback, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import * as m from 'motion/react-m';
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
import { removeHighlightImage, uploadHighlightImage } from '@/features/media/server/image-actions';
import { initialMediaActionState } from '@/features/media/server/action-state';
import { EditorPhotoField, useEditorPhoto } from '@/features/media/components/editor-photo-field';
import { MediaImage } from '@/features/media/components/media-image';
import { usePhotoAfterSave } from '@/features/media/client/use-photo-after-save';
import { listReorder } from '@/components/motion/motion-primitives';
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

function uploadPhoto(highlightId: string, image: File) {
  const formData = new FormData();
  formData.set('highlight_id', highlightId);
  formData.set('image', image);
  return uploadHighlightImage(initialMediaActionState, formData);
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
  onSaved: (message: string, kind: 'success' | 'error') => void;
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
  const photo = useEditorPhoto(
    getPublicImageVariantUrl('highlight-images', highlight?.image_path, 'card'),
    'Foto pronta para salvar junto com o destaque.',
  );
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];
  usePhotoAfterSave({ saveState: state, file: photo.file, upload: uploadPhoto, onSaved });
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
      <EditorPhotoField
        photo={photo}
        previewAlt="Prévia do destaque"
        previewShapeClassName="rounded-xl"
        removal={
          highlight
            ? {
                action: removeHighlightImage,
                confirmTitle: 'Remover foto deste destaque?',
                description: 'A foto deixará de aparecer no banner.',
                entityId: highlight.id,
                fieldName: 'highlight_id',
              }
            : null
        }
        title="Foto do banner"
      />
      {/* O sucesso fecha a gaveta e aparece no aviso da lista; aqui fica só o erro. */}
      <AdminNotice kind="error" message={state.status === 'error' ? state.message : undefined} />
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
  const titleRef = useRef<HTMLHeadingElement>(null);
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
          <h1
            className="disp text-2xl font-bold text-ink lg:text-[28px]"
            ref={titleRef}
            tabIndex={-1}
          >
            Destaques
          </h1>
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
          <m.article
            {...listReorder}
            className="rounded-card bg-white p-4 shadow-card"
            key={highlight.id}
          >
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
                fallbackFocusRef={titleRef}
                title={`Excluir ${highlight.title}?`}
              />
            </div>
            <p className="mt-3 text-xs text-muted">Posição {index + 1}</p>
          </m.article>
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
