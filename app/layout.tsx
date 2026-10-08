import type { Metadata } from 'next';
import { Anton, JetBrains_Mono, Nunito_Sans, Poppins } from 'next/font/google';

import './globals.css';

const poppins = Poppins({ variable: '--font-poppins', subsets: ['latin'], weight: ['500', '600', '700', '800'] });
const nunito = Nunito_Sans({ variable: '--font-nunito', subsets: ['latin'], weight: ['400', '500', '600', '700'] });
const mono = JetBrains_Mono({ variable: '--font-mono', subsets: ['latin'], weight: ['400', '500', '600'] });
const anton = Anton({ variable: '--font-anton', subsets: ['latin'], weight: '400' });

export const metadata: Metadata = {
  title: 'Salgaê Lanchonete',
  description: 'Cardápio local da Salgaê Lanchonete.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={`${poppins.variable} ${nunito.variable} ${mono.variable} ${anton.variable}`}><body>{children}</body></html>;
}
