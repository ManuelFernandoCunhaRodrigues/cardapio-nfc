import type { ProductFilter } from '@/features/admin/rules/panel';

type AttentionFilter = Exclude<ProductFilter, 'all'>;

/** Filtros de atenção da lista, com os mesmos nomes da situação do produto. */
export const productFilterOptions: ReadonlyArray<{
  param: string;
  filter: AttentionFilter;
  label: string;
}> = [
  { param: 'em-falta', filter: 'unavailable', label: 'Em falta hoje' },
  { param: 'sem-foto', filter: 'without-image', label: 'Sem foto' },
  { param: 'escondidos', filter: 'hidden', label: 'Escondidos' },
];

// Endereços antigos (favoritos, links do Resumo) continuam abrindo o filtro certo.
const legacyParams: Readonly<Record<string, AttentionFilter>> = {
  indisponiveis: 'unavailable',
  desativados: 'hidden',
};

/** Lê o `?filtro=` da lista de produtos; valor desconhecido mostra todos. */
export function productFilterFromParam(param: string | null): ProductFilter {
  if (!param) return 'all';
  return (
    productFilterOptions.find((option) => option.param === param)?.filter ??
    legacyParams[param] ??
    'all'
  );
}
