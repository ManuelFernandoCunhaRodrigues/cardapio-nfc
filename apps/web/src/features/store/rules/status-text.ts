import type { StoreStatus } from '@salgae/core/rules/opening-hours';

import { formatNextOpening, formatStoreStatusTime } from '@/features/menu/rules/presentation';

/** Linha abaixo de "Aberta"/"Fechada" na Info. */
export function getStoreStatusDetail(status: StoreStatus, now: Date): string {
  if (status.isOpen) {
    return status.closesAt
      ? `Fecha às ${formatStoreStatusTime(status.closesAt)}`
      : 'Atendendo agora';
  }
  return status.opensNext
    ? `Abre ${formatNextOpening(status.opensNext, now)}`
    : 'Fechada no momento';
}

/** Nome da pílula do topo: diz o que é e para onde leva, não só "Aberta". */
export function getStoreStatusLinkLabel(isOpen: boolean): string {
  return `Loja ${isOpen ? 'aberta' : 'fechada'}: ver horários`;
}
