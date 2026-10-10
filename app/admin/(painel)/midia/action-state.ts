export type MediaActionState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  path?: string;
  signedUrl?: string;
  token?: string;
};

export const initialMediaActionState: MediaActionState = { status: 'idle' };
