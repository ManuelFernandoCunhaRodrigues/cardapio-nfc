import { createClient } from '@supabase/supabase-js';

import { requiredEnv } from '../env';

function supabaseClient() {
  return createClient(
    requiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function adminAccessToken(): Promise<string> {
  const { data, error } = await supabaseClient().auth.signInWithPassword({
    email: requiredEnv('E2E_ADMIN_EMAIL'),
    password: requiredEnv('E2E_ADMIN_PASSWORD'),
  });
  if (error || !data.session) throw new Error(`Login do admin falhou: ${error?.message}`);
  return data.session.access_token;
}

export async function customerAccessToken(): Promise<string> {
  const { data, error } = await supabaseClient().auth.signUp({
    email: `cliente-${crypto.randomUUID()}@salgae.test`,
    password: crypto.randomUUID(),
  });
  if (error || !data.session) throw new Error(`Cadastro do cliente falhou: ${error?.message}`);
  return data.session.access_token;
}
