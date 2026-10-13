import type { Metadata } from 'next';
import Image from 'next/image';

import { LoginForm } from '@/components/admin/login-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return <main className="min-h-screen bg-cream px-4 py-14">
    <div className="mx-auto w-full max-w-[390px] text-center">
      <Image alt="Salgaê" className="mx-auto h-auto w-[190px]" height={120} priority src="/brand/salgae-logo-recortada.webp" width={235} />
      <h1 className="disp mt-5 text-2xl font-bold text-ink">Painel da Salgaê</h1>
      <p className="mt-1.5 text-sm text-muted">Entre com o e-mail e a senha da equipe.</p>
      <div className="mt-6 rounded-card bg-white p-5 text-left shadow-card sm:p-6"><LoginForm /></div>
      <p className="mt-6 text-xs text-muted">Área restrita. Acesso só para a equipe da Salgaê.</p>
    </div>
  </main>;
}
