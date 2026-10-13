import type { Metadata } from 'next';

import { AdminShell } from '@/components/admin/admin-shell';
import { UnauthorizedAccess } from '@/components/admin/unauthorized-access';
import { requireAdmin } from '@/lib/admin/require-admin';
import { getStoreSettings } from '@/lib/store/get-store-settings';
import { getStoreStatus } from '@/lib/store/opening-hours';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPanelLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin();
  if (!admin) return <UnauthorizedAccess />;
  const settings = await getStoreSettings();
  const storeOpen = settings ? getStoreStatus(settings, new Date()).isOpen : null;
  return <AdminShell name={admin.name} statusOverride={settings?.status_override ?? null} storeOpen={storeOpen}>{children}</AdminShell>;
}
