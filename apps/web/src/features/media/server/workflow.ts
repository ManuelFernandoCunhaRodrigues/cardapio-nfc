export function mediaObjectPaths(basePath: string): string[] {
  return /\.[a-z0-9]{2,5}$/i.test(basePath)
    ? [basePath]
    : [`${basePath}-detail.webp`, `${basePath}-card.webp`];
}

export function isMediaUnreferenced(referenceExists: readonly boolean[]): boolean {
  return !referenceExists.some(Boolean);
}

/** Mantém o objeto anterior até o registro apontar para a nova mídia. */
export async function commitStagedMedia({
  commit,
  rollbackStaged,
  cleanupPrevious,
}: {
  commit: () => Promise<void>;
  rollbackStaged: () => Promise<void>;
  cleanupPrevious: () => Promise<void>;
}): Promise<void> {
  try {
    await commit();
  } catch (error) {
    await rollbackStaged();
    throw error;
  }
  await cleanupPrevious();
}
