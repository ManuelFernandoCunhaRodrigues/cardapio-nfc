import type { Metadata } from 'next';

import { BrandLogo } from '@/components/brand/brand-logo';
import { safeAdminReturnPath } from '@/features/admin/rules/session-return';
import { LoginForm } from '@/features/auth/components/login-form';
import { SESSION_EXPIRED_MESSAGE } from '@/lib/api/api-request-error';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

type LoginSearchParams = Record<string, string | string[] | undefined>;

export default async function AdminLoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<LoginSearchParams> }>) {
  const { motivo, voltar } = await searchParams;
  // Parâmetro repetido chega como lista; só um texto único é aceito.
  const returnTo = safeAdminReturnPath(typeof voltar === 'string' ? voltar : null);
  return (
    <main className="min-h-screen bg-cream px-4 py-14">
      <div className="mx-auto w-full max-w-[390px] text-center">
        <BrandLogo className="mx-auto h-auto w-[190px]" width={190} />
        <h1 className="disp mt-5 text-2xl font-bold text-ink">Painel da Salgaê</h1>
        <p className="mt-1.5 text-sm text-muted">Entre com o e-mail e a senha da equipe.</p>
        <div className="mt-6 rounded-card bg-white p-5 text-left shadow-card sm:p-6">
          {motivo === 'sessao' ? (
            <p
              className="mb-4 rounded-xl border border-amber/30 bg-amber-soft px-3 py-2 text-sm font-bold text-body"
              role="status"
            >
              {SESSION_EXPIRED_MESSAGE}
            </p>
          ) : null}
          <LoginForm returnTo={returnTo} />
        </div>
        <p className="mt-6 text-xs text-muted">Área restrita. Acesso só para a equipe da Salgaê.</p>
      </div>
    </main>
  );
}
