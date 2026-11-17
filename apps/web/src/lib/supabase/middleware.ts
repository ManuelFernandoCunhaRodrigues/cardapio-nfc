import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabaseEnv } from '@/lib/env';
import {
  CURRENT_PATH_HEADER,
  HAD_SESSION_HEADER,
  hasSupabaseSessionCookie,
} from '@/lib/request/current-path-header';
import type { Database } from '@salgae/core/database/database.types';

/**
 * Segue para a página com a tela atual num cabeçalho interno, sobrescrevendo o que o navegador
 * mandar. Os cabeçalhos são copiados a cada chamada para levar também os cookies renovados.
 */
function continueWithCurrentPath(request: NextRequest, hadSession: boolean): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(CURRENT_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  headers.set(HAD_SESSION_HEADER, hadSession ? '1' : '0');
  return NextResponse.next({ request: { headers } });
}

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  // Lido antes da renovação, que pode apagar os cookies de uma sessão vencida.
  const hadSession = hasSupabaseSessionCookie(request.cookies.getAll().map(({ name }) => name));
  let response = continueWithCurrentPath(request, hadSession);

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = continueWithCurrentPath(request, hadSession);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Renova a sessão vencida e confere a assinatura do token com a chave pública, sem ir ao Auth a
  // cada clique. Não substitua por getSession(), que não confere nada; quem decide o acesso é a API.
  await supabase.auth.getClaims();
  return response;
}
