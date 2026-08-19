import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Roboto, Roboto_Mono } from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider/next';
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
        {/* hotKey false: a bare 'd' would toggle the theme. */}
        <RootProvider theme={{ hotKey: false }}>{children}</RootProvider>
      </body>
    </html>
  );
}
