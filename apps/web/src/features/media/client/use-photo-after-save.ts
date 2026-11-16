'use client';

import { useEffect, useRef, useState } from 'react';

import type { MediaActionState } from '@/features/media/server/action-state';
import { isPhotoUploadPending, type PhotoSaveState } from '@/features/media/rules/photo-after-save';

/**
 * Envia a foto escolhida só depois de o registro ser salvo, porque o registro novo ainda não tem id.
 * Se a foto falhar, o registro continua salvo e dá para tentar de novo pelo editor.
 * `upload` e `onSaved` precisam manter a identidade entre renderizações.
 * Devolve `uploadingPhoto` para o botão de salvar continuar ocupado até a foto terminar.
 */
export function usePhotoAfterSave({
  saveState,
  file,
  upload,
  onSaved,
}: Readonly<{
  saveState: PhotoSaveState;
  file: File | null;
  upload: (entityId: string, file: File) => Promise<MediaActionState>;
  onSaved: (message: string, kind: 'success' | 'error') => void;
}>): { uploadingPhoto: boolean } {
  const uploading = useRef(false);
  const [finished, setFinished] = useState<PhotoSaveState | null>(null);
  useEffect(() => {
    const { entityId, message, status } = saveState;
    if (status !== 'success' || !message) return;
    if (!file) {
      onSaved(message, 'success');
      return;
    }
    if (!entityId || uploading.current) return;
    uploading.current = true;
    void upload(entityId, file)
      .then((result) => {
        setFinished(saveState);
        onSaved(result.message ?? message, result.status === 'error' ? 'error' : 'success');
      })
      .catch(() => {
        setFinished(saveState);
        onSaved('Não foi possível enviar a foto agora. Tente novamente.', 'error');
      });
  }, [file, onSaved, saveState, upload]);
  return { uploadingPhoto: isPhotoUploadPending(saveState, Boolean(file), finished) };
}
