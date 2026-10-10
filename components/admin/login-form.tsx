'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { loginSchema } from '@/lib/validators/auth';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      router.replace('/admin');
      router.refresh();
    } catch {
      setError('Não foi possível entrar agora. Tente novamente em instantes.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <Input autoComplete="email" label="E-mail" name="email" type="email" required />
      <Input autoComplete="current-password" label="Senha" name="password" type="password" required />
      {error ? <p className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">{error}</p> : null}
      <Button className="w-full" disabled={isSubmitting} type="submit">
        {isSubmitting ? 'Entrando…' : 'Entrar no painel'}
      </Button>
    </form>
  );
}
