import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabaseEnv } from '@/lib/env';
import { CURRENT_PATH_HEADER } from '@/lib/request/current-path-header';
import type { Database } from '@salgae/core/database/database.types';

/**
 * Segue para a página com a tela atual num cabeçalho interno, sobrescrevendo o que o navegador
 * mandar. Os cabeçalhos são copiados a cada chamada para levar também os cookies renovados.
 */
function continueWithCurrentPath(request: NextRequest): NextResponse {
  const headers = new Headers(request.headers);
  headers.set(CURRENT_PATH_HEADER, `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export async function updateSession(request: NextRequest) {
  const env = getSupabaseEnv();
  let response = continueWithCurrentPath(request);

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
          response = continueWithCurrentPath(request);
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
