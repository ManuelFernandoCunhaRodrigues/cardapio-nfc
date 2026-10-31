'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';

import {
  initialProductActionState,
  type ProductActionState,
} from '@/features/products/server/action-state';
import {
  deleteProduct,
  reorderProduct,
  setProductSituation,
} from '@/features/products/server/actions';
import { MediaImage } from '@/features/media/components/media-image';
import type { AdminProduct } from '@/features/admin/server/catalog';
import type { AdminCategory } from '@salgae/core/contracts/admin-api';
import { filterAdminProducts, type ProductFilter } from '@/features/admin/rules/panel';
import {
  productSituationFromFields,
  type ProductSituation,
} from '@salgae/core/rules/product-situation';
import { getPublicImageVariantUrl } from '@/features/media/rules/media-urls';
import { formatPriceBRL } from '@salgae/core/rules/price';

import { AdminIcon } from '@/features/admin/components/admin-icon';
import { AdminNotice } from '@/features/admin/components/admin-notice';
import { ConfirmDialog } from '@/features/admin/components/confirm-dialog';

const filterParams: Record<string, ProductFilter> = {
  indisponiveis: 'unavailable',
  'sem-foto': 'without-image',
  desativados: 'hidden',
};
const filterLabels = [
  { param: 'indisponiveis', label: 'Indisponíveis' },
  { param: 'sem-foto', label: 'Sem foto' },
  { param: 'desativados', label: 'Desativados' },
];
const situationLabels: Record<ProductSituation, string> = {
  menu: 'No cardápio',
  unavailable: 'Em falta hoje',
  hidden: 'Escondido',
};
type Feedback = { message: string; kind: 'success' | 'error' };
type ResultHandler = (state: ProductActionState) => void;

function SituationControl({
  product,
  onResult,
}: Readonly<{ product: AdminProduct; onResult: ResultHandler }>) {
  const [state, action] = useActionState(setProductSituation, initialProductActionState);
  const formRef = useRef<HTMLFormElement>(null);
  // O controle aparece duas vezes na página (cartões do celular e tabela do desktop): o id não
  // pode vir do produto, senão o rótulo da tabela aponta para o campo escondido dos cartões.
  const selectId = useId();
  const situation = productSituationFromFields(product);
  useEffect(() => {
    if (state.status !== 'idle' && state.message) onResult(state);
  }, [onResult, state]);
  return (
    <form action={action} className="relative z-10" ref={formRef}>
      <input name="id" type="hidden" value={product.id} />
      <label className="sr-only" htmlFor={selectId}>
        Situação de {product.name}
      </label>
      <select
        className={`min-h-11 rounded-full border px-3 font-[family-name:var(--font-poppins)] text-xs font-semibold focus:outline-hidden focus:ring-4 focus:ring-brand/20 ${situation === 'menu' ? 'border-green/20 bg-green-soft text-green' : situation === 'unavailable' ? 'border-amber/30 bg-amber-soft text-body' : 'border-danger/20 bg-danger-soft text-danger'}`}
        defaultValue={situation}
        id={selectId}
        name="situation"
        onChange={() => formRef.current?.requestSubmit()}
      >
        {Object.entries(situationLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </form>
  );
}

function QuickAction({
  action,
  values,
  label,
  icon,
  onResult,
}: Readonly<{
  action: (state: ProductActionState, formData: FormData) => Promise<ProductActionState>;
  values: Record<string, string>;
  label: string;
  icon: 'up' | 'down';
  onResult: ResultHandler;
}>) {
  const [state, formAction] = useActionState(action, initialProductActionState);
  useEffect(() => {
    if (state.status !== 'idle' && state.message) onResult(state);
  }, [onResult, state]);
  return (
    <form action={formAction}>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      ))}
      <button
        aria-label={label}
        className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border bg-white text-ink"
        title={label}
        type="submit"
      >
        <AdminIcon name={icon} />
      </button>
    </form>
  );
}

function MoreActions({
  product,
  onResult,
  returnFocusRef,
  onToggle,
}: Readonly<{
  product: AdminProduct;
  onResult: ResultHandler;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  onToggle?: (open: boolean) => void;
}>) {
  return (
    <details className="relative z-50" onToggle={(event) => onToggle?.(event.currentTarget.open)}>
      <summary
        aria-label={`Mais ações para ${product.name}`}
        className="grid min-h-11 min-w-11 cursor-pointer list-none place-items-center rounded-xl border border-border bg-white text-ink"
      >
        <AdminIcon name="more" />
      </summary>
      <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-white p-2 shadow-xl">
        <p className="px-2 py-1 text-xs font-bold text-muted">Organizar na categoria</p>
        <div className="flex gap-2">
          <QuickAction
            action={reorderProduct}
            icon="up"
            label={`Subir ${product.name}`}
            onResult={onResult}
            values={{ id: product.id, category_id: product.category_id, direction: 'up' }}
          />
          <QuickAction
            action={reorderProduct}
            icon="down"
            label={`Descer ${product.name}`}
            onResult={onResult}
            values={{ id: product.id, category_id: product.category_id, direction: 'down' }}
          />
        </div>
        <div className="mt-2 border-t border-border pt-2">
          <ConfirmDialog
            action={deleteProduct}
            description="Esta ação não pode ser desfeita. Você também pode esconder o produto e mantê-lo cadastrado."
            entityId={product.id}
            onSuccess={() => onResult({ status: 'success', message: 'Produto excluído.' })}
            returnFocusRef={returnFocusRef}
            title={`Excluir ${product.name}?`}
          />
        </div>
      </div>
    </details>
  );
}

function ProductMobileCard({
  product,
  onResult,
  returnFocusRef,
}: Readonly<{
  product: AdminProduct;
  onResult: ResultHandler;
  returnFocusRef: React.RefObject<HTMLElement | null>;
}>) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <article
      className={`relative rounded-product bg-white p-3 shadow-card ${menuOpen ? 'z-40' : 'z-0'}`}
    >
      <Link
        aria-label={`Editar ${product.name}`}
        className="absolute inset-0 rounded-product focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
        href={`/admin/produtos/${product.id}`}
      />
      <div className="pointer-events-none relative z-10 flex items-center gap-3">
        <MediaImage
          alt=""
          className="size-14 shrink-0 rounded-xl"
          name={product.name}
          src={getPublicImageVariantUrl('product-images', product.image_path, 'card')}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-[family-name:var(--font-poppins)] text-sm font-semibold text-ink">
            {product.name}
          </h2>
          <p className="mt-0.5 truncate text-xs text-muted">
            {product.category?.name ?? 'Sem categoria'} · {formatPriceBRL(product.price_cents)}
          </p>
        </div>
      </div>
      <div className="pointer-events-auto relative z-10 mt-3 flex items-start justify-between gap-2">
        <SituationControl onResult={onResult} product={product} />
        <MoreActions
          onResult={onResult}
          onToggle={setMenuOpen}
          product={product}
          returnFocusRef={returnFocusRef}
        />
      </div>
    </article>
  );
}

export function ProductsManager({
  categories,
  products,
}: Readonly<{ categories: AdminCategory[]; products: AdminProduct[] }>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [term, setTerm] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const categoryId = searchParams.get('categoria') ?? '';
  const filterParam = searchParams.get('filtro') ?? '';
  const filter = filterParams[filterParam] ?? 'all';
  const setParam = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    const suffix = next.toString();
    router.replace(`/admin/produtos${suffix ? `?${suffix}` : ''}`, { scroll: false });
  };
  const onResult = useCallback((state: ProductActionState) => {
    if (!state.message || state.status === 'idle') return;
    setFeedback({ message: state.message, kind: state.status === 'error' ? 'error' : 'success' });
  }, []);
  const filtered = useMemo(
    () => filterAdminProducts(products, { term, categoryId, filter }),
    [categoryId, filter, products, term],
  );
  const groups = useMemo(
    () =>
      categories
        .map((category) => ({
          category,
          products: filtered.filter((product) => product.category_id === category.id),
        }))
        .filter((group) => group.products.length),
    [categories, filtered],
  );

  return (
    <>
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1
            className="disp text-2xl font-bold text-ink lg:text-[28px]"
            ref={titleRef}
            tabIndex={-1}
          >
            Produtos
          </h1>
          <p className="mt-1 text-sm text-muted">
            {products.length} produtos · {categories.length} categorias
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-strong px-4 text-sm font-bold text-white shadow-brand"
          href="/admin/produtos/novo"
        >
          <AdminIcon name="plus" />
          Novo
        </Link>
      </header>
      <AdminNotice className="mt-4" kind={feedback?.kind ?? 'info'} message={feedback?.message} />
      <div className="mt-4 flex flex-col gap-3 lg:flex-row">
        <label className="relative block flex-1 lg:max-w-sm">
          <span className="sr-only">Buscar por nome</span>
          <AdminIcon
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"
            name="search"
          />
          <input
            className="min-h-11 w-full rounded-full border border-border bg-white pl-12 pr-4 text-sm text-ink placeholder:text-muted focus:outline-hidden focus:ring-4 focus:ring-brand/20"
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar por nome"
            value={term}
          />
        </label>
        <label className="hidden lg:block">
          <span className="sr-only">Filtrar por categoria</span>
          <select
            className="min-h-11 rounded-full border border-border bg-white px-4 text-sm text-ink"
            onChange={(event) => setParam('categoria', event.target.value)}
            value={categoryId}
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        aria-label="Filtrar por categoria"
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden"
      >
        {[{ id: '', name: 'Todas' }, ...categories].map((category) => (
          <button
            className={`min-h-11 shrink-0 rounded-full border px-4 font-[family-name:var(--font-poppins)] text-sm font-semibold ${categoryId === category.id ? 'border-ink bg-ink text-white' : 'border-border bg-white text-ink'}`}
            key={category.id || 'all'}
            onClick={() => setParam('categoria', category.id)}
            type="button"
          >
            {category.name}
          </button>
        ))}
      </div>
      <div aria-label="Filtros de atenção" className="mt-3 flex flex-wrap gap-2">
        <button
          aria-pressed={!filterParam}
          className={`min-h-11 rounded-full border px-4 text-xs font-bold ${!filterParam ? 'border-brand-strong bg-peach text-ink' : 'border-border bg-white text-body'}`}
          onClick={() => setParam('filtro', '')}
          type="button"
        >
          Todos
        </button>
        {filterLabels.map((item) => (
          <button
            aria-pressed={filterParam === item.param}
            className={`min-h-11 rounded-full border px-4 text-xs font-bold ${filterParam === item.param ? 'border-brand-strong bg-peach text-ink' : 'border-border bg-white text-body'}`}
            key={item.param}
            onClick={() => setParam('filtro', filterParam === item.param ? '' : item.param)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-4 space-y-5 lg:hidden">
        {groups.map((group) => (
          <section key={group.category.id}>
            <h2 className="mb-2 font-[family-name:var(--font-poppins)] text-sm font-semibold text-muted">
              {group.category.name} · {group.products.length}
            </h2>
            <div className="space-y-2">
              {group.products.map((product) => (
                <ProductMobileCard
                  key={product.id}
                  onResult={onResult}
                  product={product}
                  returnFocusRef={titleRef}
                />
              ))}
            </div>
          </section>
        ))}
        {!filtered.length ? (
          <AdminNotice kind="info" message="Nenhum produto encontrado com estes filtros." />
        ) : null}
      </div>
      <div className="mt-5 hidden overflow-visible rounded-card bg-white shadow-card lg:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-inner/70 text-muted">
            <tr>
              <th className="px-4 py-3 lbl">Produto</th>
              <th className="px-4 py-3 lbl">Categoria</th>
              <th className="px-4 py-3 lbl">Preço</th>
              <th className="px-4 py-3 lbl">Selo</th>
              <th className="px-4 py-3 lbl">Situação</th>
              <th className="px-4 py-3 text-right lbl">Ações</th>
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group) =>
              group.products.map((product) => (
                <tr className="border-b border-border-inner last:border-0" key={product.id}>
                  <td className="px-4 py-2">
                    <Link
                      className="flex min-h-11 items-center gap-3 font-bold text-ink"
                      href={`/admin/produtos/${product.id}`}
                    >
                      <MediaImage
                        alt=""
                        className="size-10 rounded-lg"
                        name={product.name}
                        src={getPublicImageVariantUrl('product-images', product.image_path, 'card')}
                      />
                      {product.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-muted">{group.category.name}</td>
                  <td className="px-4 py-2 font-bold text-ink">
                    {formatPriceBRL(product.price_cents)}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted">
                    {product.badge?.replace('_', ' ') ?? '—'}
                  </td>
                  <td className="px-4 py-2">
                    <SituationControl onResult={onResult} product={product} />
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <Link
                        aria-label={`Editar ${product.name}`}
                        className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-border text-ink"
                        href={`/admin/produtos/${product.id}`}
                      >
                        <AdminIcon name="edit" />
                      </Link>
                      <QuickAction
                        action={reorderProduct}
                        icon="up"
                        label={`Subir ${product.name}`}
                        onResult={onResult}
                        values={{
                          id: product.id,
                          category_id: product.category_id,
                          direction: 'up',
                        }}
                      />
                      <QuickAction
                        action={reorderProduct}
                        icon="down"
                        label={`Descer ${product.name}`}
                        onResult={onResult}
                        values={{
                          id: product.id,
                          category_id: product.category_id,
                          direction: 'down',
                        }}
                      />
                      <MoreActions
                        onResult={onResult}
                        product={product}
                        returnFocusRef={titleRef}
                      />
                    </div>
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
        {!filtered.length ? (
          <p className="p-6 text-sm text-muted">Nenhum produto encontrado com estes filtros.</p>
        ) : null}
      </div>
    </>
  );
}
