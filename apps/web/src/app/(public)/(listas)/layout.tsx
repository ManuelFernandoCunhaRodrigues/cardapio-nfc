import { PublicHeader } from '@/features/menu/components/public-header';
import { getPublicStoreSettings } from '@/features/menu/server/get-public-menu';
import { selectPublicStoreStatusSettings } from '@/features/store/rules/client-status';

export default async function PublicListsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicStoreSettings();
  const initialNow = new Date().toISOString();
  const publicSettings = settings ? selectPublicStoreStatusSettings(settings) : null;
  return (
    <>
      <PublicHeader initialNow={initialNow} settings={publicSettings} />
      {children}
    </>
  );
}
