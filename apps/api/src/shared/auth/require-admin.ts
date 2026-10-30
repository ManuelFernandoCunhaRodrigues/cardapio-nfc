import type { MiddlewareHandler } from 'hono';

import { ForbiddenError, UnauthorizedError } from '../errors/domain-errors.js';
import type { SupabaseClientFactory } from '../supabase/supabase-client-factory.js';
import type { AppHonoEnv } from '../types.js';

const unauthorizedMessage = 'Sua sessão expirou. Entre novamente.';
const forbiddenMessage = 'Você não tem permissão para acessar este recurso.';

function readBearerToken(authorization: string | undefined): string | undefined {
  const match = authorization?.match(/^Bearer ([^\s]+)$/i);
  return match?.[1];
}

export function requireAdmin(clients: SupabaseClientFactory): MiddlewareHandler<AppHonoEnv> {
  return async (context, next) => {
    const accessToken = readBearerToken(context.req.header('Authorization'));
    if (!accessToken) throw new UnauthorizedError(unauthorizedMessage);

    const supabase = clients.createUserClient(accessToken);
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !authData.user) throw new UnauthorizedError(unauthorizedMessage);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (profile?.role !== 'admin' || !profile.is_active) {
      throw new ForbiddenError(forbiddenMessage);
    }

    context.set('user', authData.user);
    context.set('supabase', supabase);
    await next();
  };
}
