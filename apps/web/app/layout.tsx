import type { Metadata, Viewport } from 'next';
import { Nunito_Sans, Poppins } from 'next/font/google';

import { getSiteEnv, getSiteUrl } from '@/lib/env';

import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});
const nunito = Nunito_Sans({
  variable: '--font-nunito',
  subsets: ['latin'],
  weight: ['400', '700'],
});
const siteEnv = getSiteEnv();
const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  title: 'Salgaê Lanchonete',
  description: 'Cardápio local da Salgaê Lanchonete.',
  applicationName: 'Salgaê Lanchonete',
  ...(siteUrl ? { metadataBase: siteUrl } : {}),
  ...(siteEnv === 'production' ? {} : { robots: { index: false, follow: false } }),
};

export const viewport: Viewport = {
  themeColor: '#E65F2A',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${nunito.variable}`}>
      <body>{children}</body>
    </html>
  );
}
