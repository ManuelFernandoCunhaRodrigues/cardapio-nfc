import { mediaObjectPaths } from '@salgae/core/rules/media-object-paths';

import { reportServerError } from '../../../shared/observability';

export interface DeletedRecordImageStore {
  isImageInUse(imagePath: string): Promise<boolean>;
  removeImageFiles(filePaths: string[]): Promise<void>;
}

/** O registro já foi apagado: falhar a limpeza só deixa um arquivo órfão, então só registra. */
export async function removeImageIfUnused(
  store: DeletedRecordImageStore,
  imagePath: string,
  failureEvent: string,
): Promise<void> {
  try {
    if (await store.isImageInUse(imagePath)) return;
    await store.removeImageFiles(mediaObjectPaths(imagePath));
  } catch (error) {
    reportServerError({ event: failureEvent, error });
  }
}
