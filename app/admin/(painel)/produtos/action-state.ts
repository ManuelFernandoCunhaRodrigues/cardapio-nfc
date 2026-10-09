export type ProductActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialProductActionState: ProductActionState = { status: 'idle' };
