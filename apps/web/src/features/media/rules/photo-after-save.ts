export type PhotoSaveState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  entityId?: string;
};

/**
 * Enquanto a foto sobe depois de o registro ser salvo, o botão continua ocupado: um segundo toque
 * criaria outro registro. `finished` é o salvamento cujo envio de foto já terminou.
 */
export function isPhotoUploadPending(
  saveState: PhotoSaveState,
  hasFile: boolean,
  finished: PhotoSaveState | null,
): boolean {
  return (
    hasFile &&
    saveState.status === 'success' &&
    Boolean(saveState.message) &&
    Boolean(saveState.entityId) &&
    finished !== saveState
  );
}
