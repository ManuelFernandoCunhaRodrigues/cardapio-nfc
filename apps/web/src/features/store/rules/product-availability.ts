import type { StoreStatus } from '@salgae/core/rules/opening-hours';

import { formatStoreStatusTime } from '@/features/menu/rules/presentation';

export type ProductAvailabilityNotice = {
  tone: 'available' | 'store-closed' | 'unavailable';
  text: string;
};

/** Com a loja fechada, o produto disponível não pode prometer "agora". */
export function getProductAvailabilityNotice(
  isAvailable: boolean,
  store: StoreStatus,
): ProductAvailabilityNotice {
  if (!isAvailable) {
    return {
      tone: 'unavailable',
      text: 'Indisponível no momento. Pergunte ao atendente quando volta.',
    };
  }
  if (store.isOpen) return { tone: 'available', text: 'Disponível agora' };
  const storeHours = 'Disponível no horário da loja';
  return {
    tone: 'store-closed',
    text: store.opensNext
      ? `${storeHours} · abre ${formatStoreStatusTime(store.opensNext, true)}`
      : storeHours,
  };
}
