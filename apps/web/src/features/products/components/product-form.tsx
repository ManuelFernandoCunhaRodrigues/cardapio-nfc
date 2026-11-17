'use client';

import Link from 'next/link';
import { useActionState, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import {
  initialProductActionState,
  type ProductActionState,
} from '@/features/products/server/action-state';
import { createProduct, updateProduct } from '@/features/products/server/actions';
import {
  isProductFormDirty,
  productDraftFrom,
  validateProductDraft,
  type ProductDraft,
} from '@/features/products/rules/product-draft';
import { uploadProductImage } from '@/features/media/server/image-actions';
import { initialMediaActionState } from '@/features/media/server/action-state';
import { ProductCard } from '@/features/menu/components/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminProduct } from '@/features/admin/server/catalog';
import type { AdminCategory } from '@salgae/core/contracts/admin-api';
import {
  creationProgressSteps,
  runProductCreationFlow,
  type CreationFlowResult,
  type CreationStage,
} from '@/features/admin/rules/panel';
import {
  fieldsFromProductSituation,
  type ProductSituation,
} from '@salgae/core/rules/product-situation';
import {
  friendlyVideoError,
  uploadProductVideoFile,
} from '@/features/media/client/product-media-client';
import { parsePriceBRL } from '@salgae/core/rules/parse-price';

import { useFocusFirstInvalid } from '@/features/admin/client/use-focus-first-invalid';
import { useLeaveGuard } from '@/features/admin/client/use-leave-guard';
import { AdminIcon } from '@/features/admin/components/admin-icon';
import { AdminNotice } from '@/features/admin/components/admin-notice';
import { ProductMediaManager } from '@/features/media/components/product-media-manager';

const REVIEW_FIELDS_MESSAGE = 'Revise os campos destacados antes de salvar.';
const LEAVE_WHILE_BUSY_MESSAGE = 'O envio ainda não terminou. Sair mesmo assim?';
// Tempo em que o botão mostra "Salvo" depois de gravar.
const SAVED_LABEL_MS = 2000;

const situationOptions: Array<{ value: ProductSituation; label: string; help: string }> = [
  { value: 'menu', label: 'No cardápio', help: 'Visível e disponível' },
  { value: 'unavailable', label: 'Em falta hoje', help: 'Visível com aviso' },
  { value: 'hidden', label: 'Escondido', help: 'Não aparece' },
];

const badgeOptions = [
  ['', 'Sem selo'],
  ['mais_pedido', 'Mais pedido'],
  ['novo', 'Novo'],
  ['quentinho', 'Quentinho'],
] as const;

type FailedCreationStep = Exclude<CreationStage, 'done'>;

/** A API recusou o produto: o estado traz a mensagem e, se houver, os erros de cada campo. */
class ProductRejectedError extends Error {
  constructor(readonly state: ProductActionState) {
    super('product_rejected');
  }
}

async function createProductOrThrow(formData: FormData) {
  const response = await createProduct(initialProductActionState, formData);
  if (response.status !== 'success' || !response.entityId) throw new ProductRejectedError(response);
  return { productId: response.entityId };
}

async function uploadPreparedImage(productId: string, image: File) {
  const media = new FormData();
  media.set('product_id', productId);
  media.set('image', image);
  const response = await uploadProductImage(initialMediaActionState, media);
  if (response.status === 'error') throw new Error(response.message);
}

function createdProductUrl(result: CreationFlowResult, hadVideo: boolean): string {
  const query = new URLSearchParams({ criado: '1' });
  if (result.image === 'error') query.set('foto', 'erro');
  if (result.video === 'error' || (hadVideo && result.video === 'skipped'))
    query.set('video', 'erro');
  return `/admin/produtos/${result.productId}?${query}`;
}

function saveButtonLabel({
  editing,
  working,
  saved,
}: Readonly<{ editing: boolean; working: boolean; saved: boolean }>): string {
  if (working) return editing ? 'Salvando…' : 'Criando…';
  if (saved) return 'Salvo ✓';
  return editing ? 'Salvar alterações' : 'Criar produto';
}

function SaveButton({
  editing,
  busy = false,
  saved = false,
  blocked = false,
}: Readonly<{ editing: boolean; busy?: boolean; saved?: boolean; blocked?: boolean }>) {
  const { pending } = useFormStatus();
  const working = pending || busy;
  return (
    <Button className="w-full lg:w-auto" disabled={working || blocked} type="submit">
      {saveButtonLabel({ editing, working, saved })}
    </Button>
  );
}

/** Produto novo sem nenhuma categoria: avisa antes de enviar e leva direto à criação de uma. */
function MissingCategoryNotice() {
  return (
    <div
      className="mb-4 rounded-xl border border-amber/30 bg-amber-soft px-3 py-2.5 text-sm text-body"
      role="status"
    >
      <p className="font-bold">Crie uma categoria antes de cadastrar produtos.</p>
      <p className="mt-0.5">Todo produto fica dentro de uma categoria do cardápio.</p>
      <Link
        className="mt-1 inline-flex min-h-11 items-center font-bold text-brand-strong underline"
        href="/admin/categorias?nova=1"
      >
        Criar categoria
      </Link>
    </div>
  );
}

function CreationProgress({
  stage,
  hasImage,
  hasVideo,
  failedStep,
}: Readonly<{
  stage: CreationStage | null;
  hasImage: boolean;
  hasVideo: boolean;
  failedStep: FailedCreationStep | null;
}>) {
  if (!stage) return null;
  const labels = { product: 'Salvar produto', image: 'Enviar foto', video: 'Enviar vídeo' };
  const steps = creationProgressSteps({ hasImage, hasVideo, stage, failedStep });
  return (
    <div aria-live="polite" className="rounded-xl border border-border bg-white p-3">
      <p className="text-sm font-bold text-ink">
        {failedStep
          ? 'Não foi possível concluir esta etapa.'
          : stage === 'done'
            ? 'Produto criado.'
            : 'Criando produto…'}
      </p>
      <ol className={`mt-2 grid gap-2 ${steps.length > 1 ? 'sm:grid-cols-3' : ''}`}>
        {steps.map((item, index) => (
          <li
            className={`flex items-center gap-2 text-xs font-bold ${item.status === 'complete' ? 'text-green' : item.status === 'current' ? 'text-brand-strong' : item.status === 'failed' ? 'text-danger' : 'text-muted'}`}
            key={item.value}
          >
            <span
              className={`grid size-6 place-items-center rounded-full ${item.status === 'complete' ? 'bg-green-soft' : item.status === 'current' ? 'bg-peach' : item.status === 'failed' ? 'bg-danger-soft' : 'bg-surface-inner'}`}
            >
              {item.status === 'complete' ? '✓' : item.status === 'failed' ? '!' : index + 1}
            </span>
            {labels[item.value]}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CategoryPicker({
  categories,
  selectedId,
  error,
  onSelect,
}: Readonly<{
  categories: AdminCategory[];
  selectedId: string;
  error?: string;
  onSelect: (categoryId: string) => void;
}>) {
  return (
    <div className="space-y-2">
      <span className="block text-sm font-bold text-ink" id="product-category-label">
        Categoria
      </span>
      <input name="category_id" type="hidden" value={selectedId} />
      {/* Botões não aceitam aria-invalid: com erro, o grupo é marcado com data-invalid e recebe o
          foco (tabIndex -1), para quem envia ser levado até ele. */}
      <div
        aria-describedby={error ? 'product-category-error' : undefined}
        data-invalid={error ? true : undefined}
        aria-labelledby="product-category-label"
        className="flex flex-wrap gap-2 rounded-xl focus:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
        role="group"
        tabIndex={error ? -1 : undefined}
      >
        {categories.length ? null : (
          <p className="text-sm text-muted">Nenhuma categoria cadastrada ainda.</p>
        )}
        {categories.map((category) => (
          <button
            aria-pressed={selectedId === category.id}
            className={`min-h-11 rounded-full border px-4 text-sm font-bold ${selectedId === category.id ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink'}`}
            key={category.id}
            onClick={() => onSelect(category.id)}
            type="button"
          >
            {category.name}
          </button>
        ))}
      </div>
      {error ? (
        <p className="text-sm text-danger" id="product-category-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ProductForm({
  categories,
  product,
  created = false,
  creationWarning,
}: Readonly<{
  categories: AdminCategory[];
  product?: AdminProduct;
  created?: boolean;
  creationWarning?: string;
}>) {
  const router = useRouter();
  const editing = Boolean(product);
  const formRef = useRef<HTMLFormElement>(null);
  const [updateState, updateAction] = useActionState(updateProduct, initialProductActionState);
  const [createState, setCreateState] = useState<ProductActionState>(initialProductActionState);
  // Erros achados antes do envio: valem até o próximo envio, na edição e na criação.
  const [validationState, setValidationState] = useState<ProductActionState | null>(null);
  const serverState = editing ? updateState : createState;
  // Cada tentativa de envio aposenta o resultado anterior do servidor: sem isto, o erro antigo
  // voltaria a aparecer enquanto o envio novo, já aprovado na validação local, está em andamento.
  const [supersededState, setSupersededState] = useState<ProductActionState | null>(null);
  const state =
    validationState ?? (serverState === supersededState ? initialProductActionState : serverState);
  const defaultCategoryId = categories[0]?.id ?? '';
  // O produto salvo volta do servidor depois de cada gravação: comparar com ele faz o formulário
  // deixar de estar alterado assim que salva.
  const savedDraft = useMemo(
    () => productDraftFrom(product, defaultCategoryId),
    [defaultCategoryId, product],
  );
  const [draft, setDraft] = useState<ProductDraft>(savedDraft);
  const [preparedImage, setPreparedImage] = useState<File | null>(null);
  const [preparedPreview, setPreparedPreview] = useState<string | null>(null);
  const [preparedVideo, setPreparedVideo] = useState<File | null>(null);
  const [preparedVideoPreview, setPreparedVideoPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Foto ou vídeo sendo preparado ou enviado (o vídeo pode levar uns 2 minutos).
  const [mediaBusy, setMediaBusy] = useState(false);
  const [creationStage, setCreationStage] = useState<CreationStage | null>(null);
  const [failedCreationStep, setFailedCreationStep] = useState<FailedCreationStep | null>(null);
  const submittingRef = useRef(false);
  const creationStageRef = useRef<CreationStage | null>(null);
  const missingCategory = !editing && categories.length === 0;
  // Resultado de gravação cujo "Salvo" já passou do tempo: guardar o estado, e não um booleano,
  // faz cada gravação nova mostrar o aviso de novo.
  const [expiredSaveState, setExpiredSaveState] = useState<ProductActionState | null>(null);
  useEffect(() => {
    if (updateState.status !== 'success') return;
    const timer = window.setTimeout(() => setExpiredSaveState(updateState), SAVED_LABEL_MS);
    return () => window.clearTimeout(timer);
  }, [updateState]);
  const situationFields = fieldsFromProductSituation(draft.situation);
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];
  const updateDraft = (changes: Partial<ProductDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));

  const hasUnsavedChanges = isProductFormDirty({
    saved: savedDraft,
    current: draft,
    hasPreparedMedia: Boolean(preparedImage || preparedVideo),
  });
  // Sair no meio da criação ou do envio interrompe o envio. O `router.replace` do fim da criação
  // não passa pelo guarda (não é clique nem voltar), então ele pode continuar ligado.
  const sending = creating || mediaBusy;
  const leaveMessage = sending ? LEAVE_WHILE_BUSY_MESSAGE : undefined;
  useLeaveGuard(hasUnsavedChanges || sending, leaveMessage);
  useFocusFirstInvalid(formRef, state);
  const justSaved =
    editing &&
    state === updateState &&
    updateState.status === 'success' &&
    updateState !== expiredSaveState &&
    !hasUnsavedChanges;
  function leave() {
    const mustConfirm = hasUnsavedChanges || sending;
    if (!mustConfirm || window.confirm(leaveMessage ?? 'Sair sem salvar as alterações?'))
      router.push('/admin/produtos');
  }

  /** Confere o rascunho com o schema da API e mostra os erros de campo; diz se pode enviar. */
  function acceptDraft(): boolean {
    const fieldErrors = validateProductDraft(draft);
    setSupersededState(serverState);
    setValidationState(
      fieldErrors ? { status: 'error', message: REVIEW_FIELDS_MESSAGE, fieldErrors } : null,
    );
    return !fieldErrors;
  }

  function handleUpdate(event: FormEvent<HTMLFormElement>) {
    // Sem o envio, o React não chama a action do formulário.
    if (!acceptDraft()) event.preventDefault();
  }

  function showCreationFailure(caught: unknown) {
    if (caught instanceof ProductRejectedError && caught.state.fieldErrors) {
      // Erro de campo não é falha de etapa: a mensagem fica junto do campo, sem o quadro de etapas.
      setCreateState(caught.state);
      setCreationStage(null);
      setFailedCreationStep(null);
      return;
    }
    setCreateState(
      caught instanceof ProductRejectedError
        ? caught.state
        : {
            status: 'error',
            message:
              caught instanceof Error
                ? friendlyVideoError(caught)
                : 'Não foi possível criar o produto agora.',
          },
    );
    const failedStage = creationStageRef.current;
    setFailedCreationStep(
      failedStage === 'image' || failedStage === 'video' ? failedStage : 'product',
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || !acceptDraft()) return;
    submittingRef.current = true;
    creationStageRef.current = 'product';
    setCreating(true);
    setCreationStage('product');
    setFailedCreationStep(null);
    setCreateState(initialProductActionState);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await runProductCreationFlow({
        createProduct: () => createProductOrThrow(formData),
        uploadImage: preparedImage
          ? (productId) => uploadPreparedImage(productId, preparedImage)
          : undefined,
        uploadVideo: preparedVideo
          ? async (productId) => {
              await uploadProductVideoFile(productId, preparedVideo);
            }
          : undefined,
        onStage: (stage) => {
          creationStageRef.current = stage;
          setCreationStage(stage);
        },
      });
      const mediaFailure =
        result.image === 'error' ? 'image' : result.video === 'error' ? 'video' : null;
      if (mediaFailure) {
        creationStageRef.current = mediaFailure;
        setCreationStage(mediaFailure);
        setFailedCreationStep(mediaFailure);
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      router.replace(createdProductUrl(result, Boolean(preparedVideo)));
    } catch (caught) {
      showCreationFailure(caught);
      submittingRef.current = false;
      setCreating(false);
    }
  }

  const preview = useMemo(
    () => ({
      id: product?.id ?? '00000000-0000-4000-8000-000000000000',
      category_id: draft.categoryId || '00000000-0000-4000-8000-000000000001',
      name: draft.name || 'Nome do produto',
      slug: product?.slug ?? 'produto',
      description: draft.description || null,
      price_cents: parsePriceBRL(draft.price) ?? 0,
      image_path: product?.image_path ?? null,
      video_path: product?.video_path ?? null,
      badge: draft.badge,
      sort_order: product?.sort_order ?? 0,
      ...fieldsFromProductSituation(draft.situation),
    }),
    [draft, product],
  );

  return (
    <form
      action={editing ? updateAction : undefined}
      className="pb-28 lg:pb-0"
      noValidate
      onSubmit={editing ? handleUpdate : handleCreate}
      ref={formRef}
    >
      {/* No computador o cabeçalho fica preso no topo: o Salvar continua à vista ao rolar. */}
      <header className="mb-4 grid grid-cols-[44px_1fr_44px] items-center gap-2 lg:sticky lg:top-0 lg:z-30 lg:-mx-8 lg:flex lg:justify-between lg:bg-cream/95 lg:px-8 lg:py-3 lg:backdrop-blur">
        <button
          aria-label="Voltar para produtos"
          className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-white text-ink lg:hidden"
          onClick={leave}
          type="button"
        >
          <AdminIcon name="back" />
        </button>
        <div className="text-center lg:text-left">
          <nav aria-label="Caminho" className="hidden text-xs lg:block">
            <Link
              className="font-bold text-brand-strong underline-offset-2 hover:underline"
              href="/admin/produtos"
            >
              Produtos
            </Link>{' '}
            <span className="text-muted">› {product?.name ?? 'Novo produto'}</span>
          </nav>
          <h1 className="disp text-xl font-bold text-ink lg:mt-1 lg:text-[28px]">
            {editing ? 'Editar produto' : 'Novo produto'}
          </h1>
        </div>
        {/* Sem prefetch: abre em aba nova, e o prefetch renderizaria a página pública com os dados
            de antes do salvar, gravando-a no cache depois da invalidação. */}
        {product ? (
          <Link
            aria-label="Ver no cardápio"
            className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-white text-ink lg:hidden"
            href={`/produto/${product.slug}`}
            prefetch={false}
            target="_blank"
          >
            <AdminIcon name="eye" />
          </Link>
        ) : (
          <span />
        )}
        <div className="hidden items-center gap-3 lg:flex">
          {product ? (
            <Link
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-5 text-sm font-bold text-ink"
              href={`/produto/${product.slug}`}
              prefetch={false}
              target="_blank"
            >
              Ver no cardápio
            </Link>
          ) : null}
          <SaveButton
            blocked={missingCategory || mediaBusy}
            busy={creating}
            editing={editing}
            saved={justSaved}
          />
        </div>
      </header>
      {missingCategory ? <MissingCategoryNotice /> : null}
      {created ? <AdminNotice className="mb-4" message="Produto criado com sucesso." /> : null}
      {creationWarning ? (
        <AdminNotice className="mb-4" kind="error" message={creationWarning} />
      ) : null}
      <CreationProgress
        failedStep={failedCreationStep}
        hasImage={Boolean(preparedImage)}
        hasVideo={Boolean(preparedVideo)}
        stage={creationStage}
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_304px] lg:items-start">
        <div className="order-2 rounded-card bg-white p-4 shadow-card lg:order-1 lg:p-5">
          {product ? <input name="id" type="hidden" value={product.id} /> : null}
          <input name="is_active" type="hidden" value={situationFields.is_active ? 'on' : 'off'} />
          <input
            name="is_available"
            type="hidden"
            value={situationFields.is_available ? 'on' : 'off'}
          />
          <div className="grid gap-5">
            <Input
              error={errorFor('name')}
              label="Nome do produto"
              name="name"
              onChange={(event) => updateDraft({ name: event.target.value })}
              required
              value={draft.name}
            />
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-ink" htmlFor="product-price">
                  Preço
                </label>
                <input
                  aria-describedby={errorFor('price') ? 'product-price-error' : undefined}
                  aria-invalid={Boolean(errorFor('price'))}
                  className="min-h-11 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10"
                  id="product-price"
                  inputMode="decimal"
                  name="price"
                  onChange={(event) => updateDraft({ price: event.target.value })}
                  placeholder="R$ 8,90"
                  required
                  value={draft.price}
                />
                {errorFor('price') ? (
                  <p className="text-sm text-danger" id="product-price-error">
                    {errorFor('price')}
                  </p>
                ) : null}
              </div>
              <CategoryPicker
                categories={categories}
                error={errorFor('category_id')}
                onSelect={(categoryId) => updateDraft({ categoryId })}
                selectedId={draft.categoryId}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-ink" htmlFor="product-description">
                Descrição
              </label>
              <textarea
                className="min-h-24 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10"
                id="product-description"
                maxLength={600}
                name="description"
                onChange={(event) => updateDraft({ description: event.target.value })}
                value={draft.description}
              />
              <p className="text-xs text-muted">Até 40 letras aparecem no cartão do cardápio.</p>
            </div>
            <div className="space-y-2">
              <span className="block text-sm font-bold text-ink">Selo</span>
              <input name="badge" type="hidden" value={draft.badge ?? ''} />
              <div className="flex flex-wrap gap-2">
                {badgeOptions.map(([value, label]) => (
                  <button
                    aria-pressed={draft.badge === (value || null)}
                    className={`min-h-11 rounded-full border px-4 text-sm font-bold ${draft.badge === (value || null) ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink'}`}
                    key={value || 'none'}
                    onClick={() => updateDraft({ badge: value || null })}
                    type="button"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <fieldset>
              <legend className="text-sm font-bold text-ink">Situação do produto</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {situationOptions.map((option) => (
                  <button
                    aria-pressed={draft.situation === option.value}
                    className={`min-h-14 rounded-xl border px-3 py-2 text-left ${draft.situation === option.value ? 'border-green bg-green-soft text-green' : 'border-border bg-white text-ink'}`}
                    key={option.value}
                    onClick={() => updateDraft({ situation: option.value })}
                    type="button"
                  >
                    <strong className="block text-sm">{option.label}</strong>
                    <span className="text-xs font-normal text-muted">{option.help}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <AdminNotice
            className="mt-5"
            kind={state.status === 'error' ? 'error' : 'success'}
            message={state.message}
          />
        </div>
        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-28">
          <ProductMediaManager
            imagePath={product?.image_path ?? null}
            name={draft.name || 'Produto'}
            onBusyChange={setMediaBusy}
            onImagePrepared={
              editing
                ? undefined
                : (file, localPreview) => {
                    setPreparedImage(file);
                    setPreparedPreview(localPreview);
                  }
            }
            onVideoPrepared={
              editing
                ? undefined
                : (file, localPreview) => {
                    setPreparedVideo(file);
                    setPreparedVideoPreview(localPreview);
                  }
            }
            preparedPreview={preparedPreview}
            preparedVideoPreview={preparedVideoPreview}
            productId={product?.id ?? ''}
            videoPath={product?.video_path ?? null}
          />
          <div className="hidden rounded-card bg-white p-4 shadow-card lg:block">
            <h2 className="disp text-lg font-semibold text-ink">Prévia no cardápio</h2>
            <div className="mt-3 max-w-[160px]">
              <ProductCard preview product={preview} />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              O cardápio mostra apenas produtos e categorias visíveis.
            </p>
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-3px_12px_rgba(23,17,13,0.08)] backdrop-blur lg:hidden">
        <SaveButton
          blocked={missingCategory || mediaBusy}
          busy={creating}
          editing={editing}
          saved={justSaved}
        />
      </div>
    </form>
  );
}
