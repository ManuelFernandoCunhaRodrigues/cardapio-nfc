import type { AdminProduct, FieldErrors } from '@salgae/core/contracts/admin-api';
import { parsePriceBRL, readPriceInput } from '@salgae/core/rules/parse-price';
import {
  fieldsFromProductSituation,
  productSituationFromFields,
  type ProductSituation,
} from '@salgae/core/rules/product-situation';
import { productFormSchema } from '@salgae/core/schemas/product';

/** O que o editor de produto mostra; o preço fica como texto, do jeito que a pessoa digita. */
export type ProductDraft = {
  name: string;
  price: string;
  categoryId: string;
  badge: AdminProduct['badge'];
  situation: ProductSituation;
  description: string;
};

function formatPriceInput(priceCents: number): string {
  return (priceCents / 100).toFixed(2).replace('.', ',');
}

/** Rascunho com os valores salvos do produto ou, no produto novo, com os padrões do formulário. */
export function productDraftFrom(
  product: AdminProduct | undefined,
  defaultCategoryId: string,
): ProductDraft {
  return {
    name: product?.name ?? '',
    price: product ? formatPriceInput(product.price_cents) : '',
    categoryId: product?.category_id ?? defaultCategoryId,
    badge: product?.badge ?? null,
    situation: product ? productSituationFromFields(product) : 'menu',
    description: product?.description ?? '',
  };
}

// Normaliza como a API grava: espaços nas pontas somem e "8,9" e "8,90" são o mesmo preço. Sem
// isso, o produto continuaria "alterado" depois de salvo.
function comparable(draft: ProductDraft) {
  return {
    name: draft.name.trim(),
    price: parsePriceBRL(draft.price) ?? draft.price.trim(),
    categoryId: draft.categoryId,
    badge: draft.badge,
    situation: draft.situation,
    description: draft.description.trim(),
  };
}

/**
 * "Alterado" vem da comparação com o salvo, e não de um evento do formulário: os botões de
 * categoria, selo e situação não disparam `change`, e desfazer à mão volta a não pedir confirmação.
 * Foto e vídeo só contam no produto novo, em que ficam guardados até criar; na edição eles são
 * gravados na hora da escolha.
 */
export function isProductFormDirty(options: {
  saved: ProductDraft;
  current: ProductDraft;
  hasPreparedMedia: boolean;
}): boolean {
  if (options.hasPreparedMedia) return true;
  const saved = comparable(options.saved);
  const current = comparable(options.current);
  return (Object.keys(saved) as Array<keyof typeof saved>).some(
    (field) => saved[field] !== current[field],
  );
}

/** Confere o rascunho com o mesmo schema da API, para o erro de campo aparecer sem esperar o envio. */
export function validateProductDraft(draft: ProductDraft): FieldErrors | null {
  const parsed = productFormSchema.safeParse({
    name: draft.name,
    description: draft.description,
    price: draft.price,
    category_id: draft.categoryId,
    badge: draft.badge,
    ...fieldsFromProductSituation(draft.situation),
  });
  const fieldErrors: FieldErrors = {};
  for (const issue of parsed.error?.issues ?? []) {
    const field = issue.path.join('.');
    fieldErrors[field] ??= [issue.message];
  }
  // Mesma leitura da API: preço inválido ou acima do teto vira erro no campo antes de enviar.
  const price = readPriceInput(draft.price);
  if (!fieldErrors.price && !price.ok) fieldErrors.price = [price.message];
  return Object.keys(fieldErrors).length ? fieldErrors : null;
}
