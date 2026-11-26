'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useOptimistic,
  useRef,
  useState,
} from 'react';
import * as m from 'motion/react-m';

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
import { listReorder } from '@/components/motion/motion-primitives';
import type { AdminProduct } from '@/features/admin/server/catalog';
import type { AdminCategory } from '@salgae/core/contracts/admin-api';
import {
  filterAdminProducts,
  reorderBoundsByProduct,
  type ReorderBounds,
} from '@/features/admin/rules/panel';
import {
  productFilterFromParam,
  productFilterOptions,
} from '@/features/products/rules/product-list-filters';
import {
  productSituationFromFields,
  type ProductSituation,
} from '@salgae/core/rules/product-situation';
import { getPublicImageVariantUrl } from '@/features/media/rules/media-urls';
import { formatPriceBRL } from '@salgae/core/rules/price';

import { AdminIcon } from '@/features/admin/components/admin-icon';
import { ConfirmDialog } from '@/features/admin/components/confirm-dialog';
import { FloatingNotice } from '@/features/admin/components/floating-notice';
import { QuickAction, QuickActionGroup } from '@/features/admin/components/quick-action';

const situationLabels: Record<ProductSituation, string> = {
  menu: 'No cardápio',
  unavailable: 'Em falta hoje',
  hidden: 'Escondido',
};
type Feedback = { message: string; kind: 'success' | 'error' };
type ResultHandler = (state: ProductActionState) => void;

// Num select fechado, as setas trocam a opção e disparam `change` a cada tecla (Chrome no Windows).
const KEYBOARD_BROWSE_KEYS = new Set(['ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

function SituationControl({
  product,
  onResult,
}: Readonly<{ product: AdminProduct; onResult: ResultHandler }>) {
  const [state, action, saving] = useActionState(setProductSituation, initialProductActionState);
  // O controle aparece duas vezes na página (cartões do celular e tabela do desktop): o id não
  // pode vir do produto, senão o rótulo da tabela aponta para o campo escondido dos cartões.
  const selectId = useId();
  const [situation, showSituation] = useOptimistic(productSituationFromFields(product));
  // Escolha feita pelo teclado e ainda não gravada: grava no Enter ou ao sair do campo.
  const [keyboardChoice, setKeyboardChoice] = useState<ProductSituation | null>(null);
  const browsingWithKeyboard = useRef(false);
  useEffect(() => {
    if (state.status !== 'idle' && state.message) onResult(state);
  }, [onResult, state]);

  // Sem <form action>: o React reinicia o formulário depois da action e o select voltaria à opção
  // do primeiro carregamento. Assim ele mostra a escolha e, ao terminar, o que está salvo.
  function saveSituation(nextSituation: ProductSituation) {
    setKeyboardChoice(null);
    if (nextSituation === situation) return;
    const formData = new FormData();
    formData.set('id', product.id);
    formData.set('situation', nextSituation);
    startTransition(() => {
      showSituation(nextSituation);
      action(formData);
    });
  }

  function changeSituation(nextSituation: ProductSituation) {
    // Durante a gravação o campo fica travado (aria-disabled, sem perder o foco).
    if (saving) return;
    if (browsingWithKeyboard.current) setKeyboardChoice(nextSituation);
    else saveSituation(nextSituation);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLSelectElement>) {
    if (KEYBOARD_BROWSE_KEYS.has(event.key)) browsingWithKeyboard.current = true;
    if (event.key === 'Enter' && keyboardChoice) {
      event.preventDefault();
      saveSituation(keyboardChoice);
    }
  }

  const shown = keyboardChoice ?? situation;
  return (
    <div className="relative z-10 flex items-center gap-2">
      <label className="sr-only" htmlFor={selectId}>
        Situação de {product.name}
      </label>
      <select
        aria-busy={saving}
        aria-disabled={saving}
        className={`min-h-11 rounded-full border px-3 font-[family-name:var(--font-poppins)] text-xs font-semibold focus:outline-hidden focus:ring-4 focus:ring-brand/20 aria-disabled:cursor-progress aria-disabled:opacity-60 ${shown === 'menu' ? 'border-green/20 bg-green-soft text-green' : shown === 'unavailable' ? 'border-amber/30 bg-amber-soft text-body' : 'border-danger/20 bg-danger-soft text-danger'}`}
        id={selectId}
        onBlur={() => {
          browsingWithKeyboard.current = false;
          if (keyboardChoice) saveSituation(keyboardChoice);
        }}
        onChange={(event) => changeSituation(event.target.value as ProductSituation)}
        onKeyDown={handleKeyDown}
        onPointerDown={() => {
          browsingWithKeyboard.current = false;
        }}
        value={shown}
      >
        {Object.entries(situationLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {saving ? (
        <span className="text-xs font-bold text-muted" role="status">
          Salvando…
        </span>
      ) : null}
    </div>
  );
}

function ReorderButtons({
  product,
  bounds,
  onResult,
}: Readonly<{ product: AdminProduct; bounds?: ReorderBounds; onResult: ResultHandler }>) {
  return (
    <>
      <QuickAction
        action={reorderProduct}
        disabled={bounds?.isFirst}
        icon="up"
        label={`Subir ${product.name}`}
        onResult={onResult}
        values={{ id: product.id, category_id: product.category_id, direction: 'up' }}
      />
      <QuickAction
        action={reorderProduct}
        disabled={bounds?.isLast}
        icon="down"
        label={`Descer ${product.name}`}
        onResult={onResult}
        values={{ id: product.id, category_id: product.category_id, direction: 'down' }}
      />
    </>
  );
}

const REORDER_LOCKED_MESSAGE = 'Para mudar a ordem, limpe a busca e os filtros.';
// Altura do menu mais a barra de baixo do celular: com menos espaço que isto, o menu abre para cima.
const MENU_SPACE_BELOW = 320;

function isInsideDialog(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest('[role="dialog"]'));
}

type MenuControl = { open: boolean; onOpenChange: (open: boolean) => void };

/**
 * Fecha o menu com Esc (devolvendo o foco ao "⋯") e com toque fora dele. A confirmação de excluir
 * abre numa camada própria: tocar nela ou apertar Esc lá não fecha o menu por baixo.
 */
function useDismissableMenu(
  { open, onOpenChange }: MenuControl,
  menuRef: React.RefObject<HTMLElement | null>,
  triggerRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isInsideDialog(event.target)) return;
      onOpenChange(false);
      triggerRef.current?.focus();
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || menuRef.current?.contains(target)) return;
      if (isInsideDialog(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, [menuRef, onOpenChange, open, triggerRef]);
}

function MoreActions({
  product,
  bounds,
  reorderLocked,
  onResult,
  fallbackFocusRef,
  menu,
}: Readonly<{
  product: AdminProduct;
  bounds?: ReorderBounds;
  reorderLocked: boolean;
  onResult: ResultHandler;
  fallbackFocusRef?: React.RefObject<HTMLElement | null>;
  menu: MenuControl;
}>) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [opensUpward, setOpensUpward] = useState(false);
  useDismissableMenu(menu, detailsRef, summaryRef);

  return (
    <details
      className="relative z-50"
      onToggle={(event) => {
        const isOpen = event.currentTarget.open;
        if (isOpen !== menu.open) menu.onOpenChange(isOpen);
      }}
      open={menu.open}
      ref={detailsRef}
    >
      <summary
        aria-label={`Mais ações para ${product.name}`}
        className="grid min-h-11 min-w-11 cursor-pointer list-none place-items-center rounded-xl border border-border bg-white text-ink"
        onClick={(event) => {
          // Mede antes de abrir: perto do rodapé o menu ficaria atrás da barra de baixo.
          const spaceBelow =
            window.innerHeight - event.currentTarget.getBoundingClientRect().bottom;
          setOpensUpward(spaceBelow < MENU_SPACE_BELOW);
        }}
        ref={summaryRef}
      >
        <AdminIcon name="more" />
      </summary>
      <div
        className={`absolute right-0 z-50 w-56 rounded-xl border border-border bg-white p-2 shadow-xl ${opensUpward ? 'bottom-full mb-2' : 'mt-2'}`}
      >
        <p className="px-2 py-1 text-xs font-bold text-muted">Organizar na categoria</p>
        {reorderLocked ? (
          <p className="px-2 pb-1 text-xs text-muted">{REORDER_LOCKED_MESSAGE}</p>
        ) : (
          <div className="flex gap-2">
            <ReorderButtons bounds={bounds} onResult={onResult} product={product} />
          </div>
        )}
        <div className="mt-2 border-t border-border pt-2">
          <ConfirmDialog
            action={deleteProduct}
            description="Esta ação não pode ser desfeita. Você também pode esconder o produto e mantê-lo cadastrado."
            entityId={product.id}
            onSuccess={() => onResult({ status: 'success', message: 'Produto excluído.' })}
            fallbackFocusRef={fallbackFocusRef}
            title={`Excluir ${product.name}?`}
          />
        </div>
      </div>
    </details>
  );
}

function ProductMobileCard({
  product,
  bounds,
  reorderLocked,
  onResult,
  fallbackFocusRef,
  menu,
}: Readonly<{
  product: AdminProduct;
  bounds?: ReorderBounds;
  reorderLocked: boolean;
  onResult: ResultHandler;
  fallbackFocusRef: React.RefObject<HTMLElement | null>;
  menu: MenuControl;
}>) {
  return (
    <m.article
      {...listReorder}
      className={`relative rounded-product bg-white p-3 shadow-card ${menu.open ? 'z-40' : 'z-0'}`}
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
          bounds={bounds}
          fallbackFocusRef={fallbackFocusRef}
          menu={menu}
          onResult={onResult}
          product={product}
          reorderLocked={reorderLocked}
        />
      </div>
    </m.article>
  );
}

function EmptyProducts({
  hasProducts,
  onClearFilters,
}: Readonly<{ hasProducts: boolean; onClearFilters: () => void }>) {
  if (!hasProducts) {
    return (
      <div className="mt-5 rounded-card bg-white p-6 text-center shadow-card">
        <p className="font-bold text-ink">Nenhum produto cadastrado ainda.</p>
        <p className="mt-1 text-sm text-muted">
          Cadastre o primeiro produto para ele aparecer no cardápio.
        </p>
        <Link
          className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-strong px-5 text-sm font-bold text-white shadow-brand"
          href="/admin/produtos/novo"
        >
          <AdminIcon name="plus" />
          Criar produto
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-5 rounded-card bg-white p-6 text-center shadow-card">
      <p className="text-sm text-muted">Nenhum produto encontrado com estes filtros.</p>
      <button
        className="mt-3 inline-flex min-h-11 items-center rounded-full border border-border bg-white px-5 text-sm font-bold text-ink"
        onClick={onClearFilters}
        type="button"
      >
        Limpar filtros
      </button>
    </div>
  );
}

export function ProductsManager({
  categories,
  products,
}: Readonly<{ categories: AdminCategory[]; products: AdminProduct[] }>) {
  const searchParams = useSearchParams();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [term, setTerm] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const categoryId = searchParams.get('categoria') ?? '';
  const filter = productFilterFromParam(searchParams.get('filtro'));
  // Subir e Descer trocam com o vizinho da categoria inteira, que pode não estar à vista.
  const reorderLocked = Boolean(term.trim()) || filter !== 'all';
  // Um menu "⋯" aberto por vez; a chave separa os cartões do celular da tabela do computador.
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuFor = (key: string): MenuControl => ({
    open: openMenu === key,
    onOpenChange: (open) =>
      setOpenMenu((current) => (open ? key : current === key ? null : current)),
  });
  const setParam = (name: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    const suffix = next.toString();
    // Os filtros rodam no navegador: sem ida ao servidor, a resposta é imediata e a tela não recarrega.
    window.history.replaceState(null, '', `/admin/produtos${suffix ? `?${suffix}` : ''}`);
  };
  const clearFilters = () => {
    setTerm('');
    window.history.replaceState(null, '', '/admin/produtos');
  };
  const onResult = useCallback((state: ProductActionState) => {
    if (state.status === 'idle') {
      setFeedback(null);
      return;
    }
    if (!state.message) return;
    setFeedback({ message: state.message, kind: state.status === 'error' ? 'error' : 'success' });
  }, []);
  const dismissFeedback = useCallback(() => setFeedback(null), []);
  const reorderBounds = useMemo(() => reorderBoundsByProduct(products), [products]);
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
    <QuickActionGroup>
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
      <FloatingNotice feedback={feedback} onDismiss={dismissFeedback} />
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
          aria-pressed={filter === 'all'}
          className={`min-h-11 rounded-full border px-4 text-xs font-bold ${filter === 'all' ? 'border-brand-strong bg-peach text-ink' : 'border-border bg-white text-body'}`}
          onClick={() => setParam('filtro', '')}
          type="button"
        >
          Todos
        </button>
        {productFilterOptions.map((item) => (
          <button
            aria-pressed={filter === item.filter}
            className={`min-h-11 rounded-full border px-4 text-xs font-bold ${filter === item.filter ? 'border-brand-strong bg-peach text-ink' : 'border-border bg-white text-body'}`}
            key={item.param}
            onClick={() => setParam('filtro', filter === item.filter ? '' : item.param)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      {reorderLocked && filtered.length ? (
        <p className="mt-3 text-xs text-muted">{REORDER_LOCKED_MESSAGE}</p>
      ) : null}
      {filtered.length ? null : (
        <EmptyProducts hasProducts={products.length > 0} onClearFilters={clearFilters} />
      )}
      <div className="mt-4 space-y-5 lg:hidden">
        {groups.map((group) => (
          <section key={group.category.id}>
            <h2 className="mb-2 font-[family-name:var(--font-poppins)] text-sm font-semibold text-muted">
              {group.category.name}
              {group.category.is_active ? '' : ' (escondida)'} · {group.products.length}
            </h2>
            <div className="space-y-2">
              {group.products.map((product) => (
                <ProductMobileCard
                  bounds={reorderBounds.get(product.id)}
                  fallbackFocusRef={titleRef}
                  key={product.id}
                  menu={menuFor(`card:${product.id}`)}
                  onResult={onResult}
                  product={product}
                  reorderLocked={reorderLocked}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      <div
        className={`mt-5 hidden overflow-visible rounded-card bg-white shadow-card ${filtered.length ? 'lg:block' : ''}`}
      >
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
                <m.tr
                  {...listReorder}
                  className="border-b border-border-inner last:border-0"
                  key={product.id}
                >
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
                  <td className="px-4 py-2 text-muted">
                    {group.category.name}
                    {group.category.is_active ? null : (
                      <span className="mt-0.5 block text-xs font-bold text-danger">escondida</span>
                    )}
                  </td>
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
                      {reorderLocked ? null : (
                        <ReorderButtons
                          bounds={reorderBounds.get(product.id)}
                          onResult={onResult}
                          product={product}
                        />
                      )}
                      <MoreActions
                        bounds={reorderBounds.get(product.id)}
                        fallbackFocusRef={titleRef}
                        menu={menuFor(`row:${product.id}`)}
                        onResult={onResult}
                        product={product}
                        reorderLocked={reorderLocked}
                      />
                    </div>
                  </td>
                </m.tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </QuickActionGroup>
  );
}
