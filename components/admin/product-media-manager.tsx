'use client';

import { useState } from 'react';

import { createProductVideoUpload, confirmProductVideoUpload, removeProductImage, removeProductVideo, uploadProductImage } from '@/app/admin/(painel)/midia/actions';
import { initialMediaActionState } from '@/app/admin/(painel)/midia/action-state';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { resizeImageForUpload } from '@/lib/media/client-resize';
import { validateVideoForUpload } from '@/lib/media/client-video';
import { getPublicImageVariantUrl, getPublicMediaUrl } from '@/lib/media';

type Props = { productId: string; name: string; imagePath: string | null; videoPath: string | null; onImagePrepared?: (file: File | null, preview: string | null) => void; preparedPreview?: string | null };

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div aria-live="polite" className="mt-3">
      <div className="flex justify-between gap-3 text-xs text-muted"><span>{label}</span><span>{value}%</span></div>
      <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

async function putSignedVideo(signedUrl: string, file: File, onProgress: (value: number) => void) {
  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const uploadUrl = signedUrl.startsWith('http') ? signedUrl : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1${signedUrl}`;
    request.open('PUT', uploadUrl);
    request.setRequestHeader('Content-Type', file.type);
    request.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.max(10, Math.round((event.loaded / event.total) * 90))); };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error('upload_failed'));
    request.onerror = () => reject(new Error('upload_failed'));
    request.send(file);
  });
}

/** Área de mídia usada na edição; a criação prepara a imagem e a salva após obter o id. */
export function ProductMediaManager({ productId, name, imagePath, videoPath, onImagePrepared, preparedPreview }: Readonly<Props>) {
  const [preview, setPreview] = useState<string | null>(preparedPreview ?? getPublicImageVariantUrl('product-images', imagePath, 'card'));
  const [message, setMessage] = useState<string>();
  const [progress, setProgress] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [hasImage, setHasImage] = useState(Boolean(imagePath));
  const [currentVideoPath, setCurrentVideoPath] = useState(videoPath);

  async function selectImage(file: File | undefined) {
    if (!file) return;
    setBusy(true); setProgress(15); setMessage('Preparando a foto…');
    try {
      const prepared = await resizeImageForUpload(file);
      const localPreview = URL.createObjectURL(prepared);
      setPreview(localPreview); setProgress(100); setMessage('Foto pronta para salvar.');
      onImagePrepared?.(prepared, localPreview);
      if (productId) {
        const formData = new FormData(); formData.set('product_id', productId); formData.set('image', prepared);
        setProgress(55); setMessage('Otimizando e enviando a foto…');
        const result = await uploadProductImage(initialMediaActionState, formData);
        if (result.status === 'error') {
          setProgress(undefined); setMessage(result.message);
        } else {
          setHasImage(true); setProgress(100); setMessage(result.message);
        }
      }
    } catch (error) {
      setProgress(undefined); setMessage(error instanceof Error && error.message === 'image_too_large' ? 'A foto deve ter no máximo 15 MB antes da redução.' : 'Não foi possível preparar esta foto. Escolha outra imagem.');
    } finally { setBusy(false); }
  }

  async function selectVideo(file: File | undefined) {
    if (!file || !productId) return;
    setBusy(true); setProgress(5);
    try {
      setMessage('Validando vídeo…'); await validateVideoForUpload(file);
      const signedForm = new FormData(); signedForm.set('product_id', productId); signedForm.set('mime_type', file.type);
      const signed = await createProductVideoUpload(initialMediaActionState, signedForm);
      if (signed.status !== 'success' || !signed.signedUrl || !signed.path) throw new Error(signed.message);
      setMessage('Enviando vídeo…'); await putSignedVideo(signed.signedUrl, file, setProgress);
      setProgress(95); setMessage('Confirmando vídeo…'); const confirm = new FormData(); confirm.set('product_id', productId); confirm.set('path', signed.path);
      const result = await confirmProductVideoUpload(initialMediaActionState, confirm);
      if (result.status === 'error') {
        setProgress(undefined); setMessage(result.message);
      } else {
        setCurrentVideoPath(result.path ?? signed.path); setProgress(100); setMessage(result.message);
      }
    } catch (error) { setProgress(undefined); setMessage(error instanceof Error && error.message && error.message !== 'upload_failed' ? error.message : 'Não foi possível enviar o vídeo. Tente novamente.'); }
    finally { setBusy(false); }
  }

  /* eslint-disable-next-line @next/next/no-img-element -- prévia local antes da conversão no servidor */
  return <section className="mt-6 border-t border-border pt-6"><h2 className="disp text-xl font-bold text-ink">Foto e vídeo</h2><p className="mt-1 text-sm leading-6 text-muted">Foto: câmera ou galeria. Ela será convertida em WebP. Vídeo opcional: MP4/WebM, até 15 s e 10 MB.</p><div className="mt-4 grid gap-5 sm:grid-cols-2"><div><div className="aspect-square overflow-hidden rounded-card border border-border bg-surface-inner">{preview ? <img alt={`Prévia de ${name}`} className="h-full w-full object-cover" src={preview} /> : <div className="grid h-full place-items-center p-5 text-center text-sm text-muted">A foto de capa aparece aqui.</div>}</div><label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-border bg-white px-4 text-sm font-bold text-ink hover:bg-surface-inner"><input accept="image/*" className="sr-only" disabled={busy} onChange={(event) => void selectImage(event.target.files?.[0])} type="file" />Escolher foto</label>{hasImage && productId ? <ConfirmDialog action={removeProductImage} description="A foto deixará de aparecer no cardápio. Remova o vídeo antes, se existir." entityId={productId} fieldName="product_id" onSuccess={() => { setPreview(null); setHasImage(false); setMessage('Foto removida.'); setProgress(undefined); }} title="Remover foto deste produto?" triggerLabel="Remover foto" /> : null}</div><div className="rounded-card border border-border bg-surface-inner p-4"><p className="font-bold text-ink">Vídeo curto</p><p className="mt-1 text-xs leading-5 text-muted">A foto continua sendo a capa e o fallback.</p>{currentVideoPath ? <video className="mt-3 aspect-video w-full rounded-xl bg-ink object-cover" controls muted preload="metadata" src={getPublicMediaUrl('product-videos', currentVideoPath) ?? undefined} /> : <div className="mt-3 grid aspect-video place-items-center rounded-xl border border-dashed border-border bg-white p-4 text-center text-xs text-muted">Nenhum vídeo enviado.</div>}{productId ? <><label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-ink px-4 text-sm font-bold text-cream"><input accept="video/mp4,video/webm" className="sr-only" disabled={busy} onChange={(event) => void selectVideo(event.target.files?.[0])} type="file" />Escolher vídeo</label>{currentVideoPath ? <ConfirmDialog action={removeProductVideo} description="O vídeo será removido do produto e do Storage quando não houver outra referência." entityId={productId} fieldName="product_id" onSuccess={() => { setCurrentVideoPath(null); setMessage('Vídeo removido.'); setProgress(undefined); }} title="Remover vídeo deste produto?" triggerLabel="Remover vídeo" /> : null}</> : <p className="mt-3 text-xs text-muted">Salve o produto e a foto primeiro para adicionar vídeo.</p>}</div></div>{progress !== undefined ? <Progress label={message ?? 'Processando…'} value={progress} /> : null}{message && progress === undefined ? <p aria-live="polite" className="mt-3 text-sm text-muted">{message}</p> : null}</section>;
}
