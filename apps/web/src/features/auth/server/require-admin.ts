import { adminApiPaths, adminSessionResponseSchema } from '@salgae/core/contracts/admin-api';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { adminApi } from '@/lib/api/admin-api-client';
import { ApiRequestError } from '@/lib/api/api-request-error';

export type AdminSession = {
  userId: string;
  name: string | null;
};

export type AdminAuthorization =
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'authorized'; admin: AdminSession };

/**
 * A API confere o token e o perfil (`role = admin` e ativo); aqui só lemos o veredito, uma vez por
 * renderização (`cache`), mesmo que layout e página perguntem.
 */
export const getAdminAuthorization = cache(async (): Promise<AdminAuthorization> => {
  try {
    const session = await adminApi().read(adminApiPaths.session, adminSessionResponseSchema);
    return { status: 'authorized', admin: { userId: session.userId, name: session.name } };
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 401) {
      return { status: 'unauthenticated' };
    }
    if (error instanceof ApiRequestError && error.status === 403) return { status: 'forbidden' };
    throw error;
  }
});

/** Centraliza a autorização da interface e das Server Actions do painel. */
export async function requireAdmin(
  options: { redirectUnauthenticated?: boolean } = {},
): Promise<AdminSession | null> {
  const authorization = await getAdminAuthorization();
  if (authorization.status === 'unauthenticated') {
    if (options.redirectUnauthenticated ?? true) redirect('/admin/login');
    return null;
  }
  return authorization.status === 'authorized' ? authorization.admin : null;
}
