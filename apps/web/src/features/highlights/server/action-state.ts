import type { SubmittedValues } from '@/features/admin/rules/submitted-values';

export type HighlightActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  entityId?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Textos do último envio recusado, para o formulário não voltar ao valor salvo. */
  values?: SubmittedValues;
};

export const initialHighlightActionState: HighlightActionState = { status: 'idle' };
