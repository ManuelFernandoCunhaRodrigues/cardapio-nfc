export type HighlightActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  entityId?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialHighlightActionState: HighlightActionState = { status: 'idle' };
