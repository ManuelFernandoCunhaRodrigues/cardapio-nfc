import { SignOutButton } from '@/components/admin/sign-out-button';
import { Card } from '@/components/ui/card';

export function UnauthorizedAccess() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <h1 className="disp text-2xl font-extrabold text-ink">Acesso não autorizado</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Sua conta não possui permissão ativa para acessar o painel administrativo.
        </p>
        <div className="mt-6">
          <SignOutButton />
        </div>
      </Card>
    </main>
  );
}
