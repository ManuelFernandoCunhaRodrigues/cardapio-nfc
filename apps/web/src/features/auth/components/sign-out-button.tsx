'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

import { AdminIcon } from '@/features/admin/components/admin-icon';
import { ChoiceDialog } from '@/features/admin/components/choice-dialog';

export function SignOutButton({
  compact = false,
  icon = false,
  className = '',
}: Readonly<{ compact?: boolean; icon?: boolean; className?: string }>) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  // Sair não passa pelo aviso dos links do painel e fica perto da pílula da loja no celular.
  const [confirming, setConfirming] = useState(false);

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await createClient().auth.signOut();
    } finally {
      router.replace('/admin/login');
      router.refresh();
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <Button
        aria-label={compact ? (isSigningOut ? 'Saindo' : 'Sair do painel') : undefined}
        className={`${compact ? 'min-w-11 px-3' : ''} ${className}`}
        disabled={isSigningOut}
        aria-haspopup="dialog"
        onClick={() => setConfirming(true)}
        variant="neutral"
      >
        {icon ? <AdminIcon name="logout" /> : null}
        {compact ? null : (
          <span className={icon ? 'ml-2' : ''}>{isSigningOut ? 'Saindo…' : 'Sair'}</span>
        )}
      </Button>
      <ChoiceDialog
        cancelLabel="Continuar no painel"
        confirmLabel="Sair"
        description="O que ainda não foi salvo será perdido. Para voltar, entre de novo com seu e-mail e senha."
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void signOut();
        }}
        open={confirming}
        title="Sair do painel?"
      />
    </>
  );
}
