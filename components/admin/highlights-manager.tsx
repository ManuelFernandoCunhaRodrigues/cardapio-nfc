'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { removeHighlightImage, uploadHighlightImage } from '@/app/admin/(painel)/midia/actions';
import { initialMediaActionState } from '@/app/admin/(painel)/midia/action-state';
import { createHighlight, deleteHighlight, reorderHighlight, toggleHighlight, updateHighlight } from '@/app/admin/(painel)/destaques/actions';
import { initialHighlightActionState, type HighlightActionState } from '@/app/admin/(painel)/destaques/action-state';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { MediaImage } from '@/components/menu/media-image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AdminHighlight } from '@/lib/admin/catalog';
import { resizeImageForUpload } from '@/lib/media/client-resize';
import { getPublicImageVariantUrl } from '@/lib/media';

function SaveButton({ editing }: { editing: boolean }) { const { pending } = useFormStatus(); return <Button className="w-full sm:w-auto" disabled={pending} type="submit">{pending ? 'Salvando…' : editing ? 'Salvar destaque' : 'Criar destaque'}</Button>; }
function QuickAction({ action, values, label }: { action: (state: HighlightActionState, formData: FormData) => Promise<HighlightActionState>; values: Record<string, string>; label: string }) {
  const [state, formAction] = useActionState(action, initialHighlightActionState);
  return <form action={formAction} className="inline-flex">{Object.entries(values).map(([name, value]) => <input key={name} name={name} type="hidden" value={value} />)}<Button title={state.message ?? label} type="submit" variant="neutral">{label}</Button></form>;
}

function HighlightEditor({ highlight, onCancel }: { highlight: AdminHighlight | null; onCancel: () => void }) {
  const editing = Boolean(highlight);
  const [createState, createAction] = useActionState(createHighlight, initialHighlightActionState);
  const [updateState, updateAction] = useActionState(updateHighlight, initialHighlightActionState);
  const state = editing ? updateState : createState;
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(getPublicImageVariantUrl('highlight-images', highlight?.image_path, 'card'));
  const [mediaMessage, setMediaMessage] = useState<string>();
  const uploading = useRef(false);
  const errorFor = (field: string) => state.fieldErrors?.[field]?.[0];

  useEffect(() => {
    if (state.status !== 'success' || !state.entityId || !image || uploading.current) return;
    uploading.current = true;
    void (async () => { const formData = new FormData(); formData.set('highlight_id', state.entityId!); formData.set('image', image); const result = await uploadHighlightImage(initialMediaActionState, formData); setMediaMessage(result.message); })();
  }, [image, state.entityId, state.status]);

  async function selectImage(file: File | undefined) {
    if (!file) return;
    try { const prepared = await resizeImageForUpload(file); setImage(prepared); setPreview(URL.createObjectURL(prepared)); setMediaMessage('Foto pronta para salvar junto com o destaque.'); }
    catch { setMediaMessage('Não foi possível preparar esta foto. Escolha outra imagem.'); }
  }
  /* eslint-disable-next-line @next/next/no-img-element -- prévia local do arquivo antes do upload */
  return <Card className="h-fit" key={highlight?.id ?? 'new'}><h2 className="disp text-xl font-bold text-ink">{editing ? 'Editar destaque' : 'Novo destaque'}</h2><p className="mt-1 text-sm leading-6 text-muted">Use uma rota interna ou URL completa como destino. A imagem é opcional e otimizada em WebP.</p><form action={editing ? updateAction : createAction} className="mt-5 space-y-4 pb-40 sm:pb-0" noValidate>{highlight ? <input name="id" type="hidden" value={highlight.id} /> : null}<Input defaultValue={highlight?.title ?? ''} error={errorFor('title')} label="Título" name="title" required /><div className="space-y-1.5"><label className="block text-sm font-bold text-ink" htmlFor="highlight-description">Descrição</label><textarea className="min-h-24 w-full rounded-xl border border-border bg-surface-inner px-3.5 py-3 text-sm text-ink focus:border-brand focus:outline-hidden focus:ring-4 focus:ring-brand/10" defaultValue={highlight?.description ?? ''} id="highlight-description" maxLength={600} name="description" /></div><Input defaultValue={highlight?.target ?? ''} error={errorFor('target')} label="Destino" name="target" placeholder="/cardapio ou https://…" /><label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-surface-inner px-3 text-sm font-bold text-ink"><input defaultChecked={highlight?.is_active ?? true} name="is_active" type="checkbox" /> Destaque ativo</label><div><span className="block text-sm font-bold text-ink">Imagem</span><div className="mt-2 flex items-center gap-3">{preview ? <img alt="Prévia do destaque" className="size-18 rounded-xl object-cover" src={preview} /> : <div className="grid size-18 place-items-center rounded-xl border border-dashed border-border text-center text-[10px] text-muted">Sem foto</div>}<label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border bg-white px-4 text-sm font-bold text-ink"><input accept="image/*" className="sr-only" onChange={(event) => void selectImage(event.target.files?.[0])} type="file" />Escolher foto</label></div>{highlight?.image_path ? <div className="mt-2"><ConfirmDialog action={removeHighlightImage} description="A imagem deixará de aparecer no banner público." entityId={highlight.id} fieldName="highlight_id" onSuccess={() => { setPreview(null); setMediaMessage('Foto removida.'); }} title="Remover foto deste destaque?" triggerLabel="Remover foto" /></div> : null}</div>{state.message ? <p aria-live="polite" className={state.status === 'error' ? 'text-sm text-danger' : 'text-sm text-positive'}>{state.message}</p> : null}{mediaMessage ? <p aria-live="polite" className="text-sm text-muted">{mediaMessage}</p> : null}<div className="hidden gap-3 sm:flex"><SaveButton editing={editing} />{editing ? <Button onClick={onCancel} variant="neutral">Cancelar</Button> : null}</div><div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-30 border-t border-border bg-cream/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(23,17,13,0.08)] sm:hidden"><SaveButton editing={editing} /></div></form></Card>;
}

export function HighlightsManager({ highlights }: Readonly<{ highlights: AdminHighlight[] }>) {
  const [selected, setSelected] = useState<AdminHighlight | null>(null);
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start"><div className="grid gap-4 sm:grid-cols-2">{highlights.map((highlight) => <Card className="flex flex-col" key={highlight.id}><div className="flex gap-3"><MediaImage alt="" className="size-18 shrink-0 rounded-xl" name={highlight.title} src={getPublicImageVariantUrl('highlight-images', highlight.image_path, 'card')} /><div className="min-w-0"><h2 className="disp truncate text-lg font-bold text-ink">{highlight.title}</h2><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{highlight.description || 'Sem descrição'}</p><span className={`mt-2 inline-block rounded-full px-2 py-1 font-mono text-[9px] font-bold ${highlight.is_active ? 'bg-positive/10 text-positive' : 'bg-danger/10 text-danger'}`}>{highlight.is_active ? 'ATIVO' : 'INATIVO'}</span></div></div><p className="mt-4 break-all text-xs text-muted">{highlight.target || 'Sem destino'} · posição {highlight.sort_order + 1}</p><div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => setSelected(highlight)} variant="neutral">Editar</Button><QuickAction action={toggleHighlight} label={highlight.is_active ? 'Desativar' : 'Ativar'} values={{ id: highlight.id, is_active: String(!highlight.is_active) }} /><QuickAction action={reorderHighlight} label="↑" values={{ id: highlight.id, direction: 'up' }} /><QuickAction action={reorderHighlight} label="↓" values={{ id: highlight.id, direction: 'down' }} /><ConfirmDialog action={deleteHighlight} description="A exclusão remove o destaque e sua imagem quando ela não estiver referenciada por outro item." entityId={highlight.id} title={`Excluir ${highlight.title}?`} /></div></Card>)}{!highlights.length ? <Card><h2 className="disp text-xl font-bold text-ink">Nenhum destaque ainda</h2><p className="mt-2 text-sm leading-6 text-muted">Crie um banner para apresentar novidades ou combinações no cardápio.</p></Card> : null}</div><HighlightEditor highlight={selected} key={selected?.id ?? 'new'} onCancel={() => setSelected(null)} /></div>;
}
