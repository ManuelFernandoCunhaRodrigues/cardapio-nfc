/* eslint-disable @next/next/no-img-element -- prévias locais usam URLs blob */
'use client';

import { useEffect, useRef, useState } from 'react';

import { removeProductVideo } from '@/features/media/server/actions';
import { removeProductImage, uploadProductImage } from '@/features/media/server/image-actions';
import { initialMediaActionState } from '@/features/media/server/action-state';
import { resizeImageForUpload } from '@/features/media/client/client-resize';
import { friendlyMediaError, MediaUserError } from '@/features/media/client/friendly-media-error';
import { validateVideoForUpload } from '@/features/media/client/client-video';
import { getPublicImageVariantUrl, getPublicMediaUrl } from '@/features/media/rules/media-urls';
import {
  friendlyVideoError,
  uploadProductVideoFile,
} from '@/features/media/client/product-media-client';

import { AdminIcon } from '@/features/admin/components/admin-icon';
import { AdminNotice } from '@/features/admin/components/admin-notice';
import { ConfirmDialog } from '@/features/admin/components/confirm-dialog';

type Props = {
  productId: string;
  name: string;
  imagePath: string | null;
  videoPath: string | null;
  onImagePrepared?: (file: File | null, preview: string | null) => void;
  onVideoPrepared?: (file: File | null, preview: string | null) => void;
  preparedPreview?: string | null;
  preparedVideoPreview?: string | null;
  /** Avisa quando uma foto ou vídeo começa ou termina de ser preparado ou enviado. */
  onBusyChange?: (busy: boolean) => void;
};

function Progress({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <div aria-live="polite" className="mt-3">
      <div className="flex justify-between gap-3 text-xs text-muted">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function ProductMediaManager({
  productId,
  name,
  imagePath,
  videoPath,
  onImagePrepared,
  onVideoPrepared,
  preparedPreview,
  preparedVideoPreview,
  onBusyChange,
}: Readonly<Props>) {
  const [preview, setPreview] = useState<string | null>(
    preparedPreview ?? getPublicImageVariantUrl('product-images', imagePath, 'card'),
  );
  const [videoPreview, setVideoPreview] = useState<string | null>(
    preparedVideoPreview ?? getPublicMediaUrl('product-videos', videoPath),
  );
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [hasImage, setHasImage] = useState(Boolean(imagePath || preparedPreview));
  const [hasVideo, setHasVideo] = useState(Boolean(videoPath));
  // Estado local, não a prop: a revalidação chega junto com o resultado da remoção e
  // desmontaria a confirmação antes de ela fechar e devolver o foco.
  const [hasStoredImage, setHasStoredImage] = useState(Boolean(imagePath));
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  async function selectImage(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(false);
    setProgress(15);
    setMessage('Preparando a foto…');
    try {
      const prepared = await resizeImageForUpload(file);
      const localPreview = URL.createObjectURL(prepared);
      setPreview(localPreview);
      setHasImage(true);
      onImagePrepared?.(prepared, localPreview);
      if (productId) {
        const formData = new FormData();
        formData.set('product_id', productId);
        formData.set('image', prepared);
        setProgress(55);
        setMessage('Enviando a foto…');
        const result = await uploadProductImage(initialMediaActionState, formData);
        if (result.status === 'error') throw new MediaUserError(result.message ?? '');
        setHasStoredImage(true);
        setMessage(result.message);
      } else setMessage('Foto pronta para ser enviada ao criar o produto.');
      setProgress(100);
    } catch (caught) {
      setError(true);
      setProgress(undefined);
      setMessage(friendlyMediaError(caught));
    } finally {
      setBusy(false);
    }
  }

  function showVideoError(caught: unknown) {
    setError(true);
    setProgress(undefined);
    setMessage(friendlyVideoError(caught));
  }

  // No produto novo o vídeo só sobe depois de criar o produto: sem conferir agora, um vídeo longo
  // criaria o produto e só então falharia.
  async function prepareVideoForCreation(file: File) {
    setBusy(true);
    setMessage('Validando vídeo…');
    try {
      await validateVideoForUpload(file);
      const localPreview = URL.createObjectURL(file);
      setVideoPreview(localPreview);
      onVideoPrepared?.(file, localPreview);
      setMessage('Vídeo pronto para ser enviado ao criar o produto.');
    } catch (caught) {
      showVideoError(caught);
    } finally {
      setBusy(false);
    }
  }

  async function uploadVideo(file: File) {
    setVideoPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const path = await uploadProductVideoFile(productId, file, {
        onProgress: setProgress,
        onMessage: setMessage,
      });
      setHasVideo(Boolean(path));
    } catch (caught) {
      showVideoError(caught);
    } finally {
      setBusy(false);
    }
  }

  async function selectVideo(file: File | undefined) {
    if (!file || !hasImage) return;
    setError(false);
    if (productId) await uploadVideo(file);
    else await prepareVideoForCreation(file);
  }

  return (
    <section aria-busy={busy} className="rounded-card bg-white p-4 shadow-card">
      <h2 className="disp text-lg font-semibold text-ink" ref={titleRef} tabIndex={-1}>
        Foto e vídeo
      </h2>
      <ul className="mt-1 text-xs leading-5 text-muted">
        <li>Foto: JPG, PNG ou HEIC, até 15 MB.</li>
        <li>
          Vídeo (opcional): MP4, MOV ou WebM, até 50 MB e 15 segundos. Grave em Full HD, não em 4K.
        </li>
      </ul>
      <p className="mt-2 rounded-xl bg-surface-inner px-3 py-2 text-xs leading-5 text-ink">
        {productId
          ? 'A foto e o vídeo vão para o cardápio assim que você escolhe, sem precisar salvar.'
          : 'A foto e o vídeo serão enviados quando você tocar em Criar produto.'}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="aspect-square overflow-hidden rounded-product bg-surface-inner">
            {preview ? (
              <img alt={`Prévia de ${name}`} className="h-full w-full object-cover" src={preview} />
            ) : (
              <div className="grid h-full place-items-center p-3 text-center text-xs text-muted">
                <AdminIcon className="mb-2" name="camera" />
                Adicionar foto
              </div>
            )}
          </div>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-b-xl bg-white px-2 text-center text-xs font-bold text-ink focus-within:outline-hidden focus-within:ring-4 focus-within:ring-brand/30">
            <input
              accept="image/*"
              className="sr-only"
              disabled={busy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                void selectImage(file);
              }}
              type="file"
            />
            <AdminIcon height={17} name="camera" width={17} />
            {preview ? 'Trocar foto' : 'Escolher foto'}
          </label>
          {hasStoredImage && productId ? (
            <ConfirmDialog
              action={removeProductImage}
              description="A foto deixará de aparecer no cardápio. Remova o vídeo antes, se existir."
              disabled={busy}
              entityId={productId}
              fallbackFocusRef={titleRef}
              fieldName="product_id"
              onSuccess={() => {
                setPreview(null);
                setHasImage(false);
                setHasStoredImage(false);
                setMessage('Foto removida.');
              }}
              title="Remover foto deste produto?"
              triggerLabel="Remover foto"
            />
          ) : null}
        </div>
        <div>
          <div className="aspect-square overflow-hidden rounded-product bg-ink">
            {videoPreview ? (
              <video
                className="h-full w-full object-cover"
                controls
                muted
                preload="metadata"
                src={videoPreview}
              />
            ) : (
              <div className="grid h-full place-items-center p-3 text-center text-xs text-cream/75">
                <AdminIcon className="mb-2" name="video" />
                {hasImage ? 'Adicionar vídeo' : 'Escolha a foto primeiro'}
              </div>
            )}
          </div>
          <label
            className={`mt-2 flex min-h-11 items-center justify-center gap-2 rounded-b-xl px-2 text-center text-xs font-bold focus-within:outline-hidden focus-within:ring-4 focus-within:ring-brand/30 ${hasImage ? 'cursor-pointer bg-white text-ink' : 'cursor-not-allowed bg-surface-inner text-muted'}`}
          >
            <input
              accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.m4v,.webm"
              className="sr-only"
              disabled={busy || !hasImage}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = '';
                void selectVideo(file);
              }}
              type="file"
            />
            <AdminIcon height={17} name="video" width={17} />
            {videoPreview ? 'Trocar vídeo' : 'Escolher vídeo'}
          </label>
          {hasVideo && productId ? (
            <ConfirmDialog
              action={removeProductVideo}
              description="O vídeo deixará de aparecer no produto."
              disabled={busy}
              entityId={productId}
              fallbackFocusRef={titleRef}
              fieldName="product_id"
              onSuccess={() => {
                setVideoPreview(null);
                setHasVideo(false);
                setMessage('Vídeo removido.');
              }}
              title="Remover vídeo deste produto?"
              triggerLabel="Remover vídeo"
            />
          ) : null}
        </div>
      </div>
      {progress !== undefined && progress < 100 ? (
        <Progress label={message ?? 'Enviando…'} value={progress} />
      ) : null}
      <AdminNotice className="mt-3" kind={error ? 'error' : 'info'} message={message} />
    </section>
  );
}
