export type CategoryActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};
