export type StoreSettingsActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const initialStoreSettingsActionState: StoreSettingsActionState = { status: 'idle' };
