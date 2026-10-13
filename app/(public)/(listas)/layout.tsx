import { PublicHeader } from '@/components/menu/public-header';
import { getPublicStoreSettings } from '@/lib/menu/get-public-menu';
import { getStoreStatus } from '@/lib/store/opening-hours';

export default async function PublicListsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicStoreSettings();
  const status = settings ? getStoreStatus(settings, new Date()) : null;
  return <><PublicHeader status={status} />{children}</>;
}
