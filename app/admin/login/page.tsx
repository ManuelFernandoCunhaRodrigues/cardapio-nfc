import type { Metadata } from 'next';

import { LoginForm } from '@/components/admin/login-form';
import { Card } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <p className="lbl text-positive">Área restrita</p>
        <h1 className="disp mt-3 text-3xl font-extrabold text-ink">Painel Salgaê</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Entre com as credenciais fornecidas pela administração.</p>
        <div className="mt-7"><LoginForm /></div>
      </Card>
    </main>
  );
}
