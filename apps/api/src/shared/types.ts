import type { User } from '@supabase/supabase-js';

import type { AppSupabaseClient } from './supabase/supabase-client-factory.js';

type AppVariables = {
  requestId: string;
  user: User;
  adminName: string | null;
  supabase: AppSupabaseClient;
};

export type AppHonoEnv = { Variables: AppVariables };
