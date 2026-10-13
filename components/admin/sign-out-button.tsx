'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

import { AdminIcon } from './admin-icon';

export function SignOutButton({ compact = false, icon = false, className = '' }: Readonly<{ compact?: boolean; icon?: boolean; className?: string }>) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try { await createClient().auth.signOut(); }
    finally { router.replace('/admin/login'); router.refresh(); setIsSigningOut(false); }
  }

  return <Button aria-label={compact ? (isSigningOut ? 'Saindo' : 'Sair do painel') : undefined} className={`${compact ? 'min-w-11 px-3' : ''} ${className}`} disabled={isSigningOut} onClick={signOut} variant="neutral">{icon ? <AdminIcon name="logout" /> : null}{compact ? null : <span className={icon ? 'ml-2' : ''}>{isSigningOut ? 'Saindo…' : 'Sair'}</span>}</Button>;
}
