import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export type AdminSession = {
  userId: string;
  name: string | null;
};

export type AdminAuthorization =
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'authorized'; admin: AdminSession };

export async function getAdminAuthorization(): Promise<AdminAuthorization> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'unauthenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, name')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'admin' || !profile.is_active) return { status: 'forbidden' };
  return { status: 'authorized', admin: { userId: user.id, name: profile.name } };
}

/** Centraliza a autorização da interface e das Server Actions do painel. */
export async function requireAdmin(options: { redirectUnauthenticated?: boolean } = {}): Promise<AdminSession | null> {
  const authorization = await getAdminAuthorization();
  if (authorization.status === 'unauthenticated') {
    if (options.redirectUnauthenticated ?? true) redirect('/admin/login');
    return null;
  }
  return authorization.status === 'authorized' ? authorization.admin : null;
}
