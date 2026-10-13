/* eslint-disable @next/next/no-img-element -- prévias locais usam URLs blob */
'use client';

import { useState } from 'react';

import { removeProductImage, removeProductVideo, uploadProductImage } from '@/app/admin/(painel)/midia/actions';
import { initialMediaActionState } from '@/app/admin/(painel)/midia/action-state';
import { resizeImageForUpload } from '@/lib/media/client-resize';
import { getPublicImageVariantUrl, getPublicMediaUrl } from '@/lib/media';
import { friendlyVideoError, uploadProductVideoFile } from '@/lib/admin/product-media-client';

import { AdminIcon } from './admin-icon';
import { AdminNotice } from './admin-notice';
import { ConfirmDialog } from './confirm-dialog';

type Props = {
  productId: string; name: string; imagePath: string | null; videoPath: string | null;
  onImagePrepared?: (file: File | null, preview: string | null) => void;
  onVideoPrepared?: (file: File | null, preview: string | null) => void;
  preparedPreview?: string | null; preparedVideoPreview?: string | null;
};

function Progress({ value, label }: Readonly<{ value: number; label: string }>) {
  return <div aria-live="polite" className="mt-3"><div className="flex justify-between gap-3 text-xs text-muted"><span>{label}</span><span>{value}%</span></div><div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-brand transition-all" style={{ width: `${value}%` }} /></div></div>;
}

export function ProductMediaManager({ productId, name, imagePath, videoPath, onImagePrepared, onVideoPrepared, preparedPreview, preparedVideoPreview }: Readonly<Props>) {
  const [preview, setPreview] = useState<string | null>(preparedPreview ?? getPublicImageVariantUrl('product-images', imagePath, 'card'));
  const [videoPreview, setVideoPreview] = useState<string | null>(preparedVideoPreview ?? getPublicMediaUrl('product-videos', videoPath));
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [hasImage, setHasImage] = useState(Boolean(imagePath || preparedPreview));
  const [hasVideo, setHasVideo] = useState(Boolean(videoPath));

  async function selectImage(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(false); setProgress(15); setMessage('Preparando a foto…');
    try {
      const prepared = await resizeImageForUpload(file);
      const localPreview = URL.createObjectURL(prepared);
      setPreview(localPreview); setHasImage(true); onImagePrepared?.(prepared, localPreview);
      if (productId) {
        const formData = new FormData(); formData.set('product_id', productId); formData.set('image', prepared);
        setProgress(55); setMessage('Enviando a foto…');
        const result = await uploadProductImage(initialMediaActionState, formData);
        if (result.status === 'error') throw new Error(result.message);
        setMessage(result.message);
      } else setMessage('Foto pronta para ser enviada ao criar o produto.');
      setProgress(100);
    } catch (caught) {
      setError(true); setProgress(undefined); setMessage(caught instanceof Error && caught.message === 'image_too_large' ? 'A foto deve ter no máximo 15 MB.' : caught instanceof Error && caught.message ? caught.message : 'Não foi possível preparar esta foto. Escolha outra.');
    } finally { setBusy(false); }
  }

  async function selectVideo(file: File | undefined) {
    if (!file || !hasImage) return;
    setError(false);
    const localPreview = URL.createObjectURL(file); setVideoPreview(localPreview); onVideoPrepared?.(file, localPreview);
    if (!productId) { setMessage('Vídeo pronto para ser enviado ao criar o produto.'); return; }
    setBusy(true);
    try { const path = await uploadProductVideoFile(productId, file, { onProgress: setProgress, onMessage: setMessage }); setHasVideo(Boolean(path)); }
    catch (caught) { setError(true); setProgress(undefined); setMessage(friendlyVideoError(caught)); }
    finally { setBusy(false); }
  }

  return <section aria-busy={busy} className="rounded-card bg-white p-4 shadow-card"><h2 className="disp text-lg font-semibold text-ink">Foto e vídeo</h2><p className="mt-1 text-xs leading-5 text-muted">Foto pela câmera ou galeria. Vídeo opcional, até 15 segundos.</p><div className="mt-4 grid grid-cols-2 gap-3">
    <div><div className="aspect-square overflow-hidden rounded-product bg-surface-inner">{preview ? <img alt={`Prévia de ${name}`} className="h-full w-full object-cover" src={preview} /> : <div className="grid h-full place-items-center p-3 text-center text-xs text-muted"><AdminIcon className="mb-2" name="camera" />Adicionar foto</div>}</div><label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-b-xl bg-white px-2 text-center text-xs font-bold text-ink"><input accept="image/*" className="sr-only" disabled={busy} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void selectImage(file); }} type="file" /><AdminIcon height={17} name="camera" width={17} />{preview ? 'Trocar foto' : 'Escolher foto'}</label>{imagePath && productId ? <ConfirmDialog action={removeProductImage} description="A foto deixará de aparecer no cardápio. Remova o vídeo antes, se existir." disabled={busy} entityId={productId} fieldName="product_id" onSuccess={() => { setPreview(null); setHasImage(false); setMessage('Foto removida.'); }} title="Remover foto deste produto?" triggerLabel="Remover foto" /> : null}</div>
    <div><div className="aspect-square overflow-hidden rounded-product bg-ink">{videoPreview ? <video className="h-full w-full object-cover" controls muted preload="metadata" src={videoPreview} /> : <div className="grid h-full place-items-center p-3 text-center text-xs text-cream/75"><AdminIcon className="mb-2" name="video" />{hasImage ? 'Adicionar vídeo' : 'Escolha a foto primeiro'}</div>}</div><label className={`mt-2 flex min-h-11 items-center justify-center gap-2 rounded-b-xl px-2 text-center text-xs font-bold ${hasImage ? 'cursor-pointer bg-white text-ink' : 'cursor-not-allowed bg-surface-inner text-muted'}`}><input accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm" className="sr-only" disabled={busy || !hasImage} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void selectVideo(file); }} type="file" /><AdminIcon height={17} name="video" width={17} />{videoPreview ? 'Trocar vídeo' : 'Escolher vídeo'}</label>{hasVideo && productId ? <ConfirmDialog action={removeProductVideo} description="O vídeo deixará de aparecer no produto." disabled={busy} entityId={productId} fieldName="product_id" onSuccess={() => { setVideoPreview(null); setHasVideo(false); setMessage('Vídeo removido.'); }} title="Remover vídeo deste produto?" triggerLabel="Remover vídeo" /> : null}</div>
  </div>{progress !== undefined && progress < 100 ? <Progress label={message ?? 'Enviando…'} value={progress} /> : null}<AdminNotice className="mt-3" kind={error ? 'error' : 'info'} message={message} /></section>;
}
