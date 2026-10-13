import { PublicHeader } from '@/components/menu/public-header';
import { getPublicStoreSettings } from '@/lib/menu/get-public-menu';
import { selectPublicStoreStatusSettings } from '@/lib/store/client-status';

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
