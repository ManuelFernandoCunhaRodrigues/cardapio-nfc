function productCount(count: number): string {
  return `${count} ${count === 1 ? 'produto' : 'produtos'}`;
}

/** Aviso antes de esconder uma categoria com produtos; `null` quando nada some do cardápio. */
export function hideCategoryWarning(count: number): string | null {
  if (count <= 0) return null;
  const verb = count === 1 ? 'deixará' : 'deixarão';
  return `${productCount(count)} ${verb} de aparecer no cardápio até você mostrar a categoria de novo.`;
}

/** Por que a categoria não pode ser excluída agora; `null` quando pode. */
export function deleteCategoryBlockReason(count: number): string | null {
  if (count <= 0) return null;
  const items = count === 1 ? 'o produto' : `os ${productCount(count)}`;
  return `Para excluir, mova ${items} para outra categoria ou apenas esconda a categoria.`;
}
