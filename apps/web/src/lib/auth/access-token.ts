import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

/**
 * Token do admin para chamar a API; sem sessão válida, devolve `null`.
 *
 * `getSession()` lê os cookies e renova o token se ele venceu; `getClaims()` confere a assinatura
 * localmente com a chave pública do projeto (só cai no Auth se o projeto usar chave simétrica).
 * A conferência forte, no Auth e no perfil, continua na API, que recebe este token em toda chamada.
 *
 * `cache` faz layout e páginas de uma mesma renderização dividirem uma única leitura da sessão.
 */
export const getAccessToken = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase.auth.getClaims(session.access_token);
  return error || !data ? null : session.access_token;
});
