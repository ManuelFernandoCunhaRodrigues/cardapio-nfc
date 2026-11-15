import type { User } from '@supabase/supabase-js';

import type { AppSupabaseClient } from './supabase/supabase-client-factory';

type AppVariables = {
  requestId: string;
  user: User;
  adminName: string | null;
  supabase: AppSupabaseClient;
  /** Cancelado quando a requisição passa do tempo limite (ver `requestTimeoutMiddleware`). */
  requestSignal?: AbortSignal;
};

export type AppHonoEnv = { Variables: AppVariables };
