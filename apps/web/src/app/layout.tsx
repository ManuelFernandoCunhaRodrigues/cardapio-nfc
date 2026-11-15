import type { Metadata, Viewport } from 'next';
import { Nunito_Sans, Poppins } from 'next/font/google';

import { getSiteEnv, getSiteUrl } from '@/lib/env';
import { buildShareMetadata } from '@/lib/seo/share-metadata';

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

// Padrão das rotas sem metadados próprios (painel, 404). As páginas públicas usam o nome e a frase
// cadastrados no painel; aqui fica o texto fixo para o layout raiz não depender da API.
const defaultSiteName = 'Salgaê Lanchonete';

export const metadata: Metadata = {
  ...buildShareMetadata({
    title: defaultSiteName,
    description: 'Cardápio digital com fotos e preços: salgados, combos e bebidas.',
    siteName: defaultSiteName,
  }),
  applicationName: defaultSiteName,
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
