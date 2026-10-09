'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import { initialProductActionState } from '@/app/admin/(painel)/produtos/action-state';
import { createProduct, updateProduct } from '@/app/admin/(painel)/produtos/actions';
import { ProductCard } from '@/components/menu/product-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AdminCategory, AdminProduct } from '@/lib/admin/catalog';
import { parsePriceBRL } from '@/lib/utils/parse-price';

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <Button className="w-full sm:w-auto" disabled={pending} type="submit">{pending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar produto'}</Button>;
}

export function ProductForm({ categories, product }: Readonly<{ categories: AdminCategory[]; product?: AdminProduct }>) {
  const router = useRouter();
  const editing = Boolean(product);
  const [createState, createAction] = useActionState(createProduct, initialProductActionState);
  const [updateState, updateAction] = useActionState(updateProduct, initialProductActionState);
  const action = editing ? updateAction : createAction;
  const state = editing ? updateState : createState;
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [price, setPrice] = useState(product ? (product.price_cents / 100).toFixed(2).replace('.', ',') : '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? '');
  const [badge, setBadge] = useState<AdminProduct['badge']>(product?.badge ?? null);
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isAvailable, setIsAvailable] = useState(product?.is_available ?? true);
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  useEffect(() => { if (state.status === 'success') router.push('/admin/produtos'); }, [router, state.status]);
  const preview = useMemo(() => ({
    id: product?.id ?? '00000000-0000-4000-8000-000000000000', category_id: categoryId || '00000000-0000-4000-8000-000000000001', name: name || 'Nome do produto', description: description || null,
    price_cents: parsePriceBRL(price) ?? 0, image_path: product?.image_path ?? null, video_path: product?.video_path ?? null, badge, sort_order: product?.sort_order ?? 0, is_active: isActive, is_available: isAvailable,
  }), [badge, categoryId, description, isActive, isAvailable, name, price, product]);

  return <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start" noValidate>
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="disp text-3xl font-extrabold text-ink">{editing ? 'Editar produto' : 'Novo produto'}</h1><p className="mt-2 text-sm leading-6 text-muted">A foto e o vídeo são mantidos no próximo épico. A prévia usa a miniatura existente ou o fallback.</p></div><Button onClick={() => router.push('/admin/produtos')} type="button" variant="neutral">Voltar</Button></div>
      {product ? <input name="id" type="hidden" value={product.id} /> : null}
      <div className="mt-6 grid gap-5 sm:grid-cols-2"><Input className="sm:col-span-2" error={errorFor('name')} label="Nome do produto" name="name" onChange={(event) => setName(event.target.value)} required value={name} /><div className="space-y-1.5"><label className="block text-sm font-bold text-ink" htmlFor="product-price">Preço</label><input aria-describedby={errorFor('price') ? 'product-price-error' : undefined} aria-invalid={Boolean(errorFor('price'))} className="min-h-11 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" id="product-price" inputMode="decimal" name="price" onChange={(event) => setPrice(event.target.value)} placeholder="R$ 8,90" required value={price} />{errorFor('price') ? <p className="text-sm text-danger" id="product-price-error">{errorFor('price')}</p> : null}</div><div className="space-y-1.5"><label className="block text-sm font-bold text-ink" htmlFor="product-category">Categoria</label><select aria-invalid={Boolean(errorFor('category_id'))} className="min-h-11 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" id="product-category" name="category_id" onChange={(event) => setCategoryId(event.target.value)} required value={categoryId}><option value="">Escolha uma categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}{category.is_active ? '' : ' (inativa)'}</option>)}</select>{errorFor('category_id') ? <p className="text-sm text-danger">{errorFor('category_id')}</p> : null}</div><div className="space-y-1.5 sm:col-span-2"><label className="block text-sm font-bold text-ink" htmlFor="product-description">Descrição</label><textarea className="min-h-28 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" id="product-description" maxLength={600} name="description" onChange={(event) => setDescription(event.target.value)} value={description} /></div><div className="space-y-1.5"><label className="block text-sm font-bold text-ink" htmlFor="product-badge">Selo</label><select className="min-h-11 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" id="product-badge" name="badge" onChange={(event) => setBadge((event.target.value || null) as AdminProduct['badge'])} value={badge ?? ''}><option value="">Sem selo</option><option value="mais_pedido">MAIS PEDIDO</option><option value="novo">NOVO</option><option value="quentinho">QUENTINHO</option></select></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface-inner px-3 text-sm font-bold text-ink"><input checked={isActive} name="is_active" onChange={(event) => setIsActive(event.target.checked)} type="checkbox" /> Produto ativo</label><label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface-inner px-3 text-sm font-bold text-ink"><input checked={isAvailable} name="is_available" onChange={(event) => setIsAvailable(event.target.checked)} type="checkbox" /> Disponível agora</label></div>
      {state.message ? <p aria-live="polite" className={`mt-5 rounded-xl px-3 py-2 text-sm ${state.status === 'error' ? 'border border-danger/30 bg-danger/10 text-danger' : 'border border-positive/30 bg-positive/10 text-positive'}`} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}</p> : null}
      <div className="mt-6"><SaveButton editing={editing} /></div>
    </Card>
    <aside className="lg:sticky lg:top-6"><p className="lbl mb-3 text-muted">Prévia no cardápio</p><ProductCard product={preview} /><p className="mt-3 text-xs leading-5 text-muted">A prévia é visual. O cardápio público só mostra itens ativos em categorias ativas.</p></aside>
  </form>;
}
