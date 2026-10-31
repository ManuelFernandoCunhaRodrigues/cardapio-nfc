import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Só o painel usa sessão. O cardápio lê pela API sem cookies (`lib/api/public-api-client.ts`),
// então renovar a sessão nas páginas públicas só acrescentaria uma chamada ao Auth em cada visita.
export const config = {
  matcher: ['/admin/:path*'],
};
