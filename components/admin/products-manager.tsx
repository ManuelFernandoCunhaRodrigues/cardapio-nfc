'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { initialProductActionState, type ProductActionState } from '@/app/admin/(painel)/produtos/action-state';
import { reorderProduct, toggleProduct } from '@/app/admin/(painel)/produtos/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MediaImage } from '@/components/menu/media-image';
import { getPublicImageVariantUrl } from '@/lib/media';
import type { AdminCategory, AdminProduct } from '@/lib/admin/catalog';
import { formatPriceBRL } from '@/lib/utils/format-price';

import { ConfirmDialog } from './confirm-dialog';
import { deleteProduct } from '@/app/admin/(painel)/produtos/actions';

function status(product: AdminProduct) { if (!product.is_active) return ['DESATIVADO', 'bg-danger/10 text-danger']; if (!product.is_available) return ['INDISPONÍVEL', 'bg-amber/15 text-body']; return ['ATIVO', 'bg-positive/10 text-positive']; }

function QuickSubmit({ label, variant, title }: Readonly<{ label: string; variant: 'neutral' | 'danger'; title: string }>) {
  const { pending } = useFormStatus();
  return <Button disabled={pending} title={title} type="submit" variant={variant}>{label}</Button>;
}

function QuickAction({ action, values, label, variant = 'neutral' }: Readonly<{ action: (state: ProductActionState, formData: FormData) => Promise<ProductActionState>; values: Record<string, string>; label: string; variant?: 'neutral' | 'danger' }>) {
  const [state, formAction] = useActionState(action, initialProductActionState);
  return <form action={formAction} className="inline-flex"><>{Object.entries(values).map(([name, value]) => <input key={name} name={name} type="hidden" value={value} />)}</><QuickSubmit label={label} title={state.message ?? label} variant={variant} /></form>;
}

export function ProductsManager({ categories, products }: Readonly<{ categories: AdminCategory[]; products: AdminProduct[] }>) {
  const [term, setTerm] = useState(''); const [categoryId, setCategoryId] = useState('');
  const filtered = useMemo(() => products.filter((product) => (!categoryId || product.category_id === categoryId) && product.name.toLocaleLowerCase('pt-BR').includes(term.toLocaleLowerCase('pt-BR'))), [categoryId, products, term]);
  return <>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold text-ink">Buscar por nome<input className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-normal text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" onChange={(event) => setTerm(event.target.value)} placeholder="Ex.: coxinha" value={term} /></label><label className="text-sm font-bold text-ink">Categoria<select className="mt-1.5 min-h-11 w-full rounded-xl border border-border bg-white px-3 text-sm font-normal text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" onChange={(event) => setCategoryId(event.target.value)} value={categoryId}><option value="">Todas as categorias</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div><Link className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-strong px-5 py-3 text-sm font-bold text-white shadow-brand focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href="/admin/produtos/novo">Novo produto</Link></div>
    <div className="mt-6 hidden overflow-x-auto rounded-card border border-border bg-cream shadow-card lg:block"><table className="w-full min-w-220 text-left text-sm"><thead className="border-b border-border text-muted"><tr><th className="p-4">Produto</th><th className="p-4">Categoria</th><th className="p-4">Preço</th><th className="p-4">Selo</th><th className="p-4">Status</th><th className="p-4">Ações</th></tr></thead><tbody>{filtered.map((product) => <ProductRow key={product.id} product={product} />)}</tbody></table>{!filtered.length ? <p className="p-6 text-sm text-muted">Nenhum produto encontrado.</p> : null}</div>
    <div className="mt-6 grid gap-4 lg:hidden">{filtered.map((product) => <ProductMobileCard key={product.id} product={product} />)}{!filtered.length ? <Card><p className="text-sm text-muted">Nenhum produto encontrado.</p></Card> : null}</div>
  </>;
}

function ProductRow({ product }: { product: AdminProduct }) { const [label, labelClass] = status(product); return <tr className="border-b border-border/70 last:border-0"><td className="p-4"><div className="flex items-center gap-3"><MediaImage alt="" className="size-12 rounded-xl" name={product.name} src={getPublicImageVariantUrl('product-images', product.image_path, 'card')} /><Link className="font-bold text-ink hover:text-brand-strong focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20" href={`/admin/produtos/${product.id}`}>{product.name}</Link></div></td><td className="p-4 text-muted">{product.category?.name ?? 'Sem categoria'}</td><td className="p-4 font-bold text-ink">{formatPriceBRL(product.price_cents)}</td><td className="p-4">{product.badge ? <span className="rounded-full bg-ink px-2 py-1 font-mono text-[9px] text-cream">{product.badge.replace('_', ' ').toUpperCase()}</span> : '—'}</td><td className="p-4"><span className={`rounded-full px-2 py-1 font-mono text-[9px] font-bold ${labelClass}`}>{label}</span></td><td className="p-4"><ProductActions product={product} /></td></tr>; }

function ProductMobileCard({ product }: { product: AdminProduct }) { const [label, labelClass] = status(product); return <Card><div className="flex gap-3"><MediaImage alt="" className="size-16 shrink-0 rounded-xl" name={product.name} src={getPublicImageVariantUrl('product-images', product.image_path, 'card')} /><div className="min-w-0"><Link className="disp font-bold text-ink" href={`/admin/produtos/${product.id}`}>{product.name}</Link><p className="mt-1 text-xs text-muted">{product.category?.name ?? 'Sem categoria'} · {formatPriceBRL(product.price_cents)}</p><span className={`mt-2 inline-block rounded-full px-2 py-1 font-mono text-[9px] font-bold ${labelClass}`}>{label}</span></div></div><div className="mt-4"><ProductActions product={product} /></div></Card>; }

function ProductActions({ product }: { product: AdminProduct }) { return <div className="flex flex-wrap gap-2"><QuickAction action={toggleProduct} label={product.is_available ? 'Indisponível' : 'Disponível'} values={{ id: product.id, field: 'is_available', value: String(!product.is_available) }} /><QuickAction action={toggleProduct} label={product.is_active ? 'Desativar' : 'Ativar'} values={{ id: product.id, field: 'is_active', value: String(!product.is_active) }} /><QuickAction action={reorderProduct} label="↑" values={{ id: product.id, category_id: product.category_id, direction: 'up' }} /><QuickAction action={reorderProduct} label="↓" values={{ id: product.id, category_id: product.category_id, direction: 'down' }} /><ConfirmDialog action={deleteProduct} description="Esta ação não pode ser desfeita. Considere desativar o produto. As mídias só serão removidas quando não houver outra referência." entityId={product.id} title={`Excluir ${product.name}?`} /></div>; }
