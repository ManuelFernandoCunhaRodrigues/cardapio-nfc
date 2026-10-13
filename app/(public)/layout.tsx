import { PublicNav } from '@/components/menu/public-nav';

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="mx-auto min-h-screen max-w-[480px] bg-cream pb-[calc(4.5rem+env(safe-area-inset-bottom))] shadow-[0_0_40px_rgba(23,17,13,0.08)]">{children}<PublicNav /></div>;
}
