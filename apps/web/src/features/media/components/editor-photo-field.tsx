/* eslint-disable @next/next/no-img-element -- A prévia pode ser um arquivo local, ainda sem URL pública. */
'use client';

import { useRef, useState, type ComponentProps } from 'react';

import { AdminNotice } from '@/features/admin/components/admin-notice';
import { ConfirmDialog } from '@/features/admin/components/confirm-dialog';
import { resizeImageForUpload } from '@/features/media/client/client-resize';
import { friendlyMediaError } from '@/features/media/client/friendly-media-error';

export type EditorPhoto = {
  file: File | null;
  preview: string | null;
  hasStoredPhoto: boolean;
  message?: string;
  select: (file?: File) => Promise<void>;
  markRemoved: () => void;
};

export function useEditorPhoto(storedUrl: string | null, readyMessage: string): EditorPhoto {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(storedUrl);
  const [message, setMessage] = useState<string>();
  // Estado local, não a prop: a revalidação chega junto com o resultado da remoção e
  // desmontaria a confirmação antes de ela fechar e devolver o foco.
  const [hasStoredPhoto, setHasStoredPhoto] = useState(Boolean(storedUrl));
  return {
    file,
    preview,
    hasStoredPhoto,
    message,
    select: async (selected) => {
      if (!selected) return;
      try {
        const prepared = await resizeImageForUpload(selected);
        setFile(prepared);
        setPreview(URL.createObjectURL(prepared));
        setMessage(readyMessage);
      } catch (error) {
        setMessage(friendlyMediaError(error));
      }
    },
    markRemoved: () => {
      setFile(null);
      setHasStoredPhoto(false);
      setPreview(null);
      setMessage('Foto removida.');
    },
  };
}

type PhotoRemoval = {
  action: ComponentProps<typeof ConfirmDialog>['action'];
  entityId: string;
  fieldName: string;
  confirmTitle: string;
  description: string;
};

export function EditorPhotoField({
  title,
  hint,
  previewAlt,
  previewShapeClassName,
  photo,
  removal,
}: Readonly<{
  title: string;
  hint?: string;
  previewAlt: string;
  previewShapeClassName: string;
  photo: EditorPhoto;
  /** `null` enquanto o registro ainda não existe: não há foto guardada para remover. */
  removal: PhotoRemoval | null;
}>) {
  const titleRef = useRef<HTMLSpanElement>(null);
  return (
    <div>
      <span className="block text-sm font-bold text-ink" ref={titleRef} tabIndex={-1}>
        {title}
      </span>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
      <div className="mt-2 flex items-center gap-3">
        {photo.preview ? (
          <img
            alt={previewAlt}
            className={`size-20 object-cover ${previewShapeClassName}`}
            src={photo.preview}
          />
        ) : (
          <div
            className={`grid size-20 place-items-center bg-surface-inner text-xs text-muted ${previewShapeClassName}`}
          >
            Sem foto
          </div>
        )}
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-border bg-white px-4 text-sm font-bold text-ink focus-within:outline-hidden focus-within:ring-4 focus-within:ring-brand/30">
          <input
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              void photo.select(event.target.files?.[0]);
              // Sem isto, escolher de novo o mesmo arquivo depois de um erro não dispara a troca.
              event.target.value = '';
            }}
            type="file"
          />
          Escolher foto
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">
        Foto: JPG, PNG ou HEIC, até 15 MB. A foto nova só vai para o cardápio quando você salvar.
      </p>
      {removal && photo.hasStoredPhoto ? (
        <div className="mt-2">
          <ConfirmDialog
            action={removal.action}
            description={removal.description}
            entityId={removal.entityId}
            fallbackFocusRef={titleRef}
            fieldName={removal.fieldName}
            onSuccess={photo.markRemoved}
            title={removal.confirmTitle}
            triggerLabel="Remover foto"
          />
        </div>
      ) : null}
      <AdminNotice className="mt-2" kind="info" message={photo.message} />
    </div>
  );
}
