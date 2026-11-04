'use client';

import { useRef, useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { loginSchema } from '@salgae/core/schemas/auth';
import { AdminIcon } from '@/features/admin/components/admin-icon';

type LoginPhase = 'idle' | 'signing-in' | 'opening-panel';

function SubmitLabel({ phase }: Readonly<{ phase: LoginPhase }>) {
  if (phase === 'idle') return 'Entrar no painel';
  // A `key` recria o texto a cada fase, para a entrada rodar de novo na troca.
  return (
    <span
      className="inline-flex animate-label-in items-center gap-2 motion-reduce:animate-none"
      key={phase}
    >
      {phase === 'signing-in' ? (
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:hidden"
          data-testid="login-spinner"
        />
      ) : (
        <AdminIcon className="motion-reduce:hidden" name="check" />
      )}
      {phase === 'signing-in' ? 'Entrando…' : 'Abrindo o painel…'}
    </span>
  );
}

export function LoginForm() {
  const router = useRouter();
  // A transição segue pendente até o painel aparecer, então o botão não volta ao estado inicial.
  const [isOpeningPanel, startOpeningPanel] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isSubmittingRef = useRef(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmittingRef.current) return;

    setError(null);
    const formData = new FormData(event.currentTarget);
    const result = loginSchema.safeParse({
      email: formData.get('email'),
      password: formData.get('password'),
    });

    if (!result.success) {
      setError('Revise o e-mail e a senha informados.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword(result.data);
      if (signInError) {
        setError('Não foi possível entrar com essas credenciais. Tente novamente.');
        return;
      }
      startOpeningPanel(() => {
        router.replace('/admin');
        router.refresh();
      });
    } catch {
      setError('Não foi possível entrar agora. Tente novamente em instantes.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  const phase: LoginPhase = isOpeningPanel ? 'opening-panel' : isSubmitting ? 'signing-in' : 'idle';

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <Input autoComplete="email" label="E-mail" name="email" type="email" required />
      <div className="relative">
        <Input
          autoComplete="current-password"
          className="pr-12"
          label="Senha"
          name="password"
          type={showPassword ? 'text' : 'password'}
          required
        />
        <button
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute bottom-0 right-0 grid min-h-11 min-w-11 place-items-center rounded-full text-muted focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-brand/20"
          onClick={() => setShowPassword((value) => !value)}
          type="button"
        >
          <AdminIcon name={showPassword ? 'eye-off' : 'eye'} />
        </button>
      </div>
      {error ? (
        <p
          className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button
        aria-busy={phase !== 'idle'}
        className="w-full disabled:cursor-progress disabled:opacity-100"
        disabled={phase !== 'idle'}
        type="submit"
      >
        <SubmitLabel phase={phase} />
      </Button>
    </form>
  );
}
