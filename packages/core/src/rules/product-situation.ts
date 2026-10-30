export type ProductSituation = 'menu' | 'unavailable' | 'hidden';

type ProductAvailability = { is_active: boolean; is_available: boolean };

export function productSituationFromFields(product: ProductAvailability): ProductSituation {
  if (!product.is_active) return 'hidden';
  return product.is_available ? 'menu' : 'unavailable';
}

export function fieldsFromProductSituation(situation: ProductSituation): ProductAvailability {
  if (situation === 'menu') return { is_active: true, is_available: true };
  if (situation === 'unavailable') return { is_active: true, is_available: false };
  return { is_active: false, is_available: false };
}
