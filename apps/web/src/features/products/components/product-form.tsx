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
import { uploadProductImage } from '@/features/media/server/actions';
import { initialMediaActionState } from '@/features/media/server/action-state';
import { ProductCard } from '@/features/menu/components/product-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminCategory, AdminProduct } from '@/features/admin/server/catalog';
import {
  creationProgressSteps,
  runProductCreationFlow,
  type CreationStage,
} from '@/features/admin/rules/panel';
import {
  fieldsFromProductSituation,
  productSituationFromFields,
  type ProductSituation,
} from '@salgae/core/rules/product-situation';
import {
  friendlyVideoError,
  uploadProductVideoFile,
} from '@/features/media/client/product-media-client';
import { parsePriceBRL } from '@salgae/core/rules/parse-price';

import { AdminIcon } from '@/features/admin/components/admin-icon';
import { AdminNotice } from '@/features/admin/components/admin-notice';
import { ProductMediaManager } from '@/features/media/components/product-media-manager';

const situationOptions: Array<{ value: ProductSituation; label: string; help: string }> = [
  { value: 'menu', label: 'No cardápio', help: 'Visível e disponível' },
  { value: 'unavailable', label: 'Em falta hoje', help: 'Visível com aviso' },
  { value: 'hidden', label: 'Escondido', help: 'Não aparece' },
];

function SaveButton({ editing, busy = false }: Readonly<{ editing: boolean; busy?: boolean }>) {
  const { pending } = useFormStatus();
  const disabled = pending || busy;
  return (
    <Button className="w-full lg:w-auto" disabled={disabled} type="submit">
      {disabled
        ? editing
          ? 'Salvando…'
          : 'Criando…'
        : editing
          ? 'Salvar alterações'
          : 'Criar produto'}
    </Button>
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
  failedStep: Exclude<CreationStage, 'done'> | null;
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
  const [updateState, updateAction] = useActionState(updateProduct, initialProductActionState);
  const [createState, setCreateState] = useState<ProductActionState>(initialProductActionState);
  const state = editing ? updateState : createState;
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(
    product ? (product.price_cents / 100).toFixed(2).replace('.', ',') : '',
  );
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '');
  const [badge, setBadge] = useState<AdminProduct['badge']>(product?.badge ?? null);
  const [situation, setSituation] = useState<ProductSituation>(
    product ? productSituationFromFields(product) : 'menu',
  );
  const [preparedImage, setPreparedImage] = useState<File | null>(null);
  const [preparedPreview, setPreparedPreview] = useState<string | null>(null);
  const [preparedVideo, setPreparedVideo] = useState<File | null>(null);
  const [preparedVideoPreview, setPreparedVideoPreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [creationStage, setCreationStage] = useState<CreationStage | null>(null);
  const [failedCreationStep, setFailedCreationStep] = useState<Exclude<
    CreationStage,
    'done'
  > | null>(null);
  const [dirty, setDirty] = useState(false);
  const submittingRef = useRef(false);
  const creationStageRef = useRef<CreationStage | null>(null);
  const situationFields = fieldsFromProductSituation(situation);
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!(dirty || (editing && updateState.status === 'error')) || submittingRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty, editing, updateState.status]);

  const hasUnsavedChanges = dirty || (editing && updateState.status === 'error');
  function leave() {
    if (!hasUnsavedChanges || window.confirm('Sair sem salvar as alterações?'))
      router.push('/admin/produtos');
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    creationStageRef.current = 'product';
    setCreating(true);
    setCreationStage('product');
    setFailedCreationStep(null);
    setCreateState(initialProductActionState);
    const formData = new FormData(event.currentTarget);
    let validationError: ProductActionState | null = null;
    try {
      const result = await runProductCreationFlow({
        createProduct: async () => {
          const response = await createProduct(initialProductActionState, formData);
          if (response.status !== 'success' || !response.entityId) {
            validationError = response;
            throw new Error('product_failed');
          }
          return { productId: response.entityId };
        },
        uploadImage: preparedImage
          ? async (productId) => {
              const media = new FormData();
              media.set('product_id', productId);
              media.set('image', preparedImage);
              const response = await uploadProductImage(initialMediaActionState, media);
              if (response.status === 'error') throw new Error(response.message);
            }
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
      setDirty(false);
      const query = new URLSearchParams({ criado: '1' });
      if (result.image === 'error') query.set('foto', 'erro');
      if (result.video === 'error' || (preparedVideo && result.video === 'skipped'))
        query.set('video', 'erro');
      router.replace(`/admin/produtos/${result.productId}?${query}`);
    } catch (caught) {
      if (validationError) setCreateState(validationError);
      else
        setCreateState({
          status: 'error',
          message:
            caught instanceof Error
              ? friendlyVideoError(caught)
              : 'Não foi possível criar o produto agora.',
        });
      const failedStage = creationStageRef.current as CreationStage | null;
      setFailedCreationStep(
        failedStage === 'image' || failedStage === 'video' ? failedStage : 'product',
      );
      submittingRef.current = false;
      setCreating(false);
    }
  }

  const preview = useMemo(
    () => ({
      id: product?.id ?? '00000000-0000-4000-8000-000000000000',
      category_id: categoryId || '00000000-0000-4000-8000-000000000001',
      name: name || 'Nome do produto',
      slug: product?.slug ?? 'produto',
      description: description || null,
      price_cents: parsePriceBRL(price) ?? 0,
      image_path: product?.image_path ?? null,
      video_path: product?.video_path ?? null,
      badge,
      sort_order: product?.sort_order ?? 0,
      ...situationFields,
    }),
    [badge, categoryId, description, name, price, product, situationFields],
  );

  return (
    <form
      action={editing ? updateAction : undefined}
      className="pb-28 lg:pb-0"
      noValidate
      onChange={() => setDirty(true)}
      onSubmit={editing ? () => setDirty(false) : handleCreate}
    >
      <header className="mb-4 grid grid-cols-[44px_1fr_44px] items-center gap-2 lg:flex lg:justify-between">
        <button
          aria-label="Voltar para produtos"
          className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-white text-ink lg:hidden"
          onClick={leave}
          type="button"
        >
          <AdminIcon name="back" />
        </button>
        <div className="text-center lg:text-left">
          <p className="hidden text-xs text-brand-strong lg:block">
            Produtos <span className="text-muted">› {product?.name ?? 'Novo produto'}</span>
          </p>
          <h1 className="disp text-xl font-bold text-ink lg:mt-1 lg:text-[28px]">
            {editing ? 'Editar produto' : 'Novo produto'}
          </h1>
        </div>
        {product ? (
          <Link
            aria-label="Ver no cardápio"
            className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-white text-ink lg:hidden"
            href={`/produto/${product.slug}`}
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
              target="_blank"
            >
              Ver no cardápio
            </Link>
          ) : null}
          <SaveButton busy={creating} editing={editing} />
        </div>
      </header>
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
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
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
                  onChange={(event) => setPrice(event.target.value)}
                  placeholder="R$ 8,90"
                  required
                  value={price}
                />
                {errorFor('price') ? (
                  <p className="text-sm text-danger" id="product-price-error">
                    {errorFor('price')}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <span className="block text-sm font-bold text-ink">Categoria</span>
                <input name="category_id" type="hidden" value={categoryId} />
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      className={`min-h-11 rounded-full border px-4 text-sm font-bold ${categoryId === category.id ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink'}`}
                      key={category.id}
                      onClick={() => setCategoryId(category.id)}
                      type="button"
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
                {errorFor('category_id') ? (
                  <p className="text-sm text-danger">{errorFor('category_id')}</p>
                ) : null}
              </div>
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
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
              <p className="text-xs text-muted">Até 40 letras aparecem no cartão do cardápio.</p>
            </div>
            <div className="space-y-2">
              <span className="block text-sm font-bold text-ink">Selo</span>
              <input name="badge" type="hidden" value={badge ?? ''} />
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['', 'Sem selo'],
                    ['mais_pedido', 'Mais pedido'],
                    ['novo', 'Novo'],
                    ['quentinho', 'Quentinho'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    className={`min-h-11 rounded-full border px-4 text-sm font-bold ${badge === (value || null) ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink'}`}
                    key={value || 'none'}
                    onClick={() => setBadge((value || null) as AdminProduct['badge'])}
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
                    aria-pressed={situation === option.value}
                    className={`min-h-14 rounded-xl border px-3 py-2 text-left ${situation === option.value ? 'border-green bg-green-soft text-green' : 'border-border bg-white text-ink'}`}
                    key={option.value}
                    onClick={() => setSituation(option.value)}
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
        <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-6">
          <ProductMediaManager
            imagePath={product?.image_path ?? null}
            name={name || 'Produto'}
            onImagePrepared={
              editing
                ? undefined
                : (file, localPreview) => {
                    setPreparedImage(file);
                    setPreparedPreview(localPreview);
                    setDirty(true);
                  }
            }
            onVideoPrepared={
              editing
                ? undefined
                : (file, localPreview) => {
                    setPreparedVideo(file);
                    setPreparedVideoPreview(localPreview);
                    setDirty(true);
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
              <ProductCard product={preview} />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              O cardápio mostra apenas produtos e categorias visíveis.
            </p>
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-3px_12px_rgba(23,17,13,0.08)] backdrop-blur lg:hidden">
        <SaveButton busy={creating} editing={editing} />
      </div>
    </form>
  );
}
