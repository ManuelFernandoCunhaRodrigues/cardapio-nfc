import type { Metadata } from 'next';

import { MotionProvider } from '@/components/motion/motion-provider';
import { AdminShell } from '@/features/admin/components/admin-shell';
import { UnauthorizedAccess } from '@/features/auth/components/unauthorized-access';
import { requireAdmin } from '@/features/auth/server/require-admin';
import { getAdminStoreSettings } from '@/features/store/server/get-store-settings';
import { getStoreStatus } from '@salgae/core/rules/opening-hours';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPanelLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // As duas leituras não dependem uma da outra; em série, cada clique esperava as duas idas à API.
  // `allSettled` dá prioridade ao login: com a sessão vencida, quem redireciona é `requireAdmin`,
  // que guarda a tela de origem.
  const [adminResult, storeResult] = await Promise.allSettled([
    requireAdmin(),
    getAdminStoreSettings(),
  ]);
  if (adminResult.status === 'rejected') throw adminResult.reason;
  if (storeResult.status === 'rejected') throw storeResult.reason;
  const admin = adminResult.value;
  const store = storeResult.value;
  if (!admin) return <UnauthorizedAccess />;
  const loaded = store.status === 'loaded';
  return (
    <MotionProvider>
      <AdminShell
        name={admin.name}
        statusOverride={loaded ? store.settings.status_override : null}
        storeOpen={loaded ? getStoreStatus(store.settings, new Date()).isOpen : null}
      >
        {children}
      </AdminShell>
    </MotionProvider>
  );
}
