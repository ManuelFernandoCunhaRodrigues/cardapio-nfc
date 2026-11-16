import { reportServerError } from '../../shared/observability';

export type UnusedMediaCleanup = {
  isInUse(path: string): Promise<boolean>;
  remove(path: string): Promise<void>;
};

/** Falhar a limpeza após desvincular a mídia só deixa um arquivo órfão, então registra e segue. */
export async function removeMediaIfUnused(
  path: string | null,
  cleanup: UnusedMediaCleanup,
  failureEvent: string,
): Promise<void> {
  if (!path) return;
  try {
    if (await cleanup.isInUse(path)) return;
    await cleanup.remove(path);
  } catch (error) {
    reportServerError({ event: failureEvent, error });
  }
}
