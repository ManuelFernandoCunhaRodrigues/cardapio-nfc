'use client';

import { useEffect, useRef } from 'react';

import type { MediaActionState } from '@/features/media/server/action-state';

type SaveState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  entityId?: string;
};

/**
 * Envia a foto escolhida só depois de o registro ser salvo, porque o registro novo ainda não tem id.
 * Se a foto falhar, o registro continua salvo e dá para tentar de novo pelo editor.
 * `upload` e `onSaved` precisam manter a identidade entre renderizações.
 */
export function usePhotoAfterSave({
  saveState,
  file,
  upload,
  onSaved,
}: Readonly<{
  saveState: SaveState;
  file: File | null;
  upload: (entityId: string, file: File) => Promise<MediaActionState>;
  onSaved: (message: string, kind: 'success' | 'error') => void;
}>) {
  const uploading = useRef(false);
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
        onSaved(result.message ?? message, result.status === 'error' ? 'error' : 'success');
      })
      .catch(() => {
        onSaved('Não foi possível enviar a foto agora. Tente novamente.', 'error');
      });
  }, [file, onSaved, saveState, upload]);
}
