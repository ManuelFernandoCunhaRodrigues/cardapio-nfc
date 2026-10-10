import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

export type AdminSession = {
  userId: string;
  name: string | null;
};

/** Centraliza a autorização da interface e das Server Actions do painel. */
export async function requireAdmin(options: { redirectUnauthenticated?: boolean } = {}): Promise<AdminSession | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (options.redirectUnauthenticated ?? true) redirect('/admin/login');
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, name')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin' || !profile.is_active) return null;
  return { userId: user.id, name: profile.name };
}
