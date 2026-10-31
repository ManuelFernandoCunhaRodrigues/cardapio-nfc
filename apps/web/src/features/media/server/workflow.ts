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
