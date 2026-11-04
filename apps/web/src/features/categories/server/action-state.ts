export type CategoryActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  entityId?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
