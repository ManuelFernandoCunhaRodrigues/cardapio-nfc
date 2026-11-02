import { createClient } from '@/lib/supabase/server';

/**
 * Token do admin para chamar a API. `getUser()` valida a sessão no Supabase Auth (e a renova se
 * preciso) antes de `getSession()` entregar o token já renovado; sem sessão, devolve `null`.
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
