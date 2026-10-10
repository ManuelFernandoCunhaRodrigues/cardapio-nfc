'use client';

import Link from 'next/link';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';

import { initialProductActionState } from '@/app/admin/(painel)/produtos/action-state';
import { createProduct, updateProduct } from '@/app/admin/(painel)/produtos/actions';
import { ProductCard } from '@/components/menu/product-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ProductMediaManager } from '@/components/admin/product-media-manager';
import type { AdminCategory, AdminProduct } from '@/lib/admin/catalog';
import { parsePriceBRL } from '@/lib/utils/parse-price';

function SaveButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return <Button className="w-full sm:w-auto" disabled={pending} type="submit">{pending ? 'Salvando…' : editing ? 'Salvar alterações' : 'Criar produto'}</Button>;
}

export function ProductForm({ categories, product, created = false }: Readonly<{ categories: AdminCategory[]; product?: AdminProduct; created?: boolean }>) {
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
  const [preparedImage, setPreparedImage] = useState<File | null>(null);
  const [preparedPreview, setPreparedPreview] = useState<string | null>(null);
  const [mediaMessage, setMediaMessage] = useState<string>();
  const redirectStarted = useRef(false);
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  useEffect(() => {
    if (editing || state.status !== 'success' || !state.entityId || redirectStarted.current) return;
    redirectStarted.current = true;
    const productId = state.entityId;
    void (async () => {
      let mediaFailed = false;
      if (preparedImage) {
        const { uploadProductImage } = await import('@/app/admin/(painel)/midia/actions');
        const { initialMediaActionState } = await import('@/app/admin/(painel)/midia/action-state');
        const media = new FormData(); media.set('product_id', productId); media.set('image', preparedImage);
        const result = await uploadProductImage(initialMediaActionState, media);
        mediaFailed = result.status === 'error';
        setMediaMessage(result.message);
      }
      router.replace(`/admin/produtos/${productId}?criado=1${mediaFailed ? '&midia=erro' : ''}`);
    })();
  }, [editing, preparedImage, router, state.entityId, state.status]);
  const preview = useMemo(() => ({
    id: product?.id ?? '00000000-0000-4000-8000-000000000000', category_id: categoryId || '00000000-0000-4000-8000-000000000001', name: name || 'Nome do produto', description: description || null,
    price_cents: parsePriceBRL(price) ?? 0, image_path: product?.image_path ?? null, video_path: product?.video_path ?? null, badge, sort_order: product?.sort_order ?? 0, is_active: isActive, is_available: isAvailable,
  }), [badge, categoryId, description, isActive, isAvailable, name, price, product]);

  return <form action={action} className="grid gap-6 pb-40 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:pb-0" noValidate>
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="disp text-3xl font-extrabold text-ink">{editing ? 'Editar produto' : 'Novo produto'}</h1><p className="mt-2 text-sm leading-6 text-muted">Cadastre em uma coluna no celular. A foto pode vir da câmera ou da galeria.</p></div><Button onClick={() => router.push('/admin/produtos')} type="button" variant="neutral">Voltar</Button></div>
      {product ? <input name="id" type="hidden" value={product.id} /> : null}
      <div className="mt-6 grid gap-5 sm:grid-cols-2"><Input className="sm:col-span-2" error={errorFor('name')} label="Nome do produto" name="name" onChange={(event) => setName(event.target.value)} required value={name} /><div className="space-y-1.5"><label className="block text-sm font-bold text-ink" htmlFor="product-price">Preço</label><input aria-describedby={errorFor('price') ? 'product-price-error' : undefined} aria-invalid={Boolean(errorFor('price'))} className="min-h-11 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" id="product-price" inputMode="decimal" name="price" onChange={(event) => setPrice(event.target.value)} placeholder="R$ 8,90" required value={price} />{errorFor('price') ? <p className="text-sm text-danger" id="product-price-error">{errorFor('price')}</p> : null}</div><div className="space-y-2"><span className="block text-sm font-bold text-ink">Categoria</span><input name="category_id" type="hidden" value={categoryId} /><div className="flex flex-wrap gap-2">{categories.map((category) => <button className={`min-h-11 rounded-full border px-4 text-sm font-bold ${categoryId === category.id ? 'border-brand-strong bg-brand-strong text-white' : 'border-border bg-surface-inner text-ink'}`} key={category.id} onClick={() => setCategoryId(category.id)} type="button">{category.name}</button>)}</div>{errorFor('category_id') ? <p className="text-sm text-danger">{errorFor('category_id')}</p> : null}</div><div className="space-y-1.5 sm:col-span-2"><label className="block text-sm font-bold text-ink" htmlFor="product-description">Descrição</label><textarea className="min-h-28 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" id="product-description" maxLength={600} name="description" onChange={(event) => setDescription(event.target.value)} value={description} /></div><div className="space-y-2 sm:col-span-2"><span className="block text-sm font-bold text-ink">Selo</span><input name="badge" type="hidden" value={badge ?? ''} /><div className="flex flex-wrap gap-2">{([['', 'Sem selo'], ['mais_pedido', 'Mais pedido'], ['novo', 'Novo'], ['quentinho', 'Quentinho']] as const).map(([value, label]) => <button className={`min-h-11 rounded-full border px-4 text-sm font-bold ${badge === (value || null) ? 'border-brand-strong bg-brand-strong text-white' : 'border-border bg-surface-inner text-ink'}`} key={value || 'none'} onClick={() => setBadge((value || null) as AdminProduct['badge'])} type="button">{label}</button>)}</div></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2"><label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface-inner px-3 text-sm font-bold text-ink"><input checked={isActive} name="is_active" onChange={(event) => setIsActive(event.target.checked)} type="checkbox" /> Produto ativo</label><label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface-inner px-3 text-sm font-bold text-ink"><input checked={isAvailable} name="is_available" onChange={(event) => setIsAvailable(event.target.checked)} type="checkbox" /> Disponível agora</label></div>
      <ProductMediaManager imagePath={product?.image_path ?? null} name={name || 'Produto'} onImagePrepared={(file, preview) => { setPreparedImage(file); setPreparedPreview(preview); }} preparedPreview={preparedPreview} productId={product?.id ?? ''} videoPath={product?.video_path ?? null} />
      {created ? <p aria-live="polite" className="mt-5 rounded-xl border border-positive/30 bg-positive/10 px-3 py-2 text-sm text-positive" role="status">Produto criado com sucesso. <Link className="font-bold underline" href={`/produto/${product?.id}`}>Ver no cardápio</Link></p> : null}
      {state.message && !created ? <p aria-live="polite" className={`mt-5 rounded-xl px-3 py-2 text-sm ${state.status === 'error' ? 'border border-danger/30 bg-danger/10 text-danger' : 'border border-positive/30 bg-positive/10 text-positive'}`} role={state.status === 'error' ? 'alert' : 'status'}>{state.message}{state.status === 'success' && state.entityId ? <> <Link className="font-bold underline" href={`/produto/${state.entityId}`}>Ver no cardápio</Link></> : null}</p> : null}
      {mediaMessage ? <p aria-live="polite" className="mt-3 text-sm text-muted">{mediaMessage}</p> : null}
      <div className="mt-6 hidden lg:block"><SaveButton editing={editing} /></div>
    </Card>
    <aside className="lg:sticky lg:top-6"><p className="lbl mb-3 text-muted">Prévia no cardápio</p><ProductCard product={preview} /><p className="mt-3 text-xs leading-5 text-muted">A prévia é visual. O cardápio público só mostra itens ativos em categorias ativas.</p></aside>
    <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-cream/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(23,17,13,0.08)] lg:hidden"><SaveButton editing={editing} /></div>
  </form>;
}
