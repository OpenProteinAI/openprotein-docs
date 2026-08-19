import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Roboto, Roboto_Mono } from 'next/font/google';
import { SiteFooter } from '@/components/site/footer';
import { Provider } from '@/components/site/provider';
import './global.css';

const sans = Roboto({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = Roboto_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: {
    default: 'OpenProtein.AI docs',
    template: '%s · OpenProtein.AI docs',
  },
  description:
    'Documentation for the OpenProtein.AI platform, Python API and REST API.',
  icons: { icon: '/favicon.ico' },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col font-sans">
        <Provider>
          {children}
          <SiteFooter />
        </Provider>
      </body>
    </html>
  );
}
