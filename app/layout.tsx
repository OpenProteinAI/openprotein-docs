import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Roboto_Mono } from 'next/font/google';
import { GoogleAnalytics } from '@next/third-parties/google';
import { SiteFooter } from '@/components/site/footer';
import { Provider } from '@/components/site/provider';
import { BASE_PATH } from '@/lib/base-path';
import { SITE } from '@/lib/site';
import { CLIENT_PREPAINT } from '@/lib/tutorial-client';
import './global.css';

// Object Sans, copied verbatim from the marketing site. It ships 100/400/500/800 only;
// global.css remaps 600/700 onto 500 so they don't fall through to Heavy.
const sans = localFont({
  src: [
    { path: './fonts/ObjectSans-Thin.otf', weight: '100', style: 'normal' },
    { path: './fonts/ObjectSans-Regular.otf', weight: '400', style: 'normal' },
    { path: './fonts/PPObjectSans-Medium.ttf', weight: '500', style: 'normal' },
    { path: './fonts/ObjectSans-Heavy.otf', weight: '800', style: 'normal' },
    { path: './fonts/ObjectSans-Slanted.otf', weight: '400', style: 'italic' },
    { path: './fonts/ObjectSans-HeavySlanted.otf', weight: '800', style: 'italic' },
  ],
  variable: '--font-sans',
  display: 'swap',
  // Centres the cap height in the line box; see TYPOGRAPHY.md.
  declarations: [
    { prop: 'ascent-override', value: '95.5%' },
    { prop: 'descent-override', value: '25%' },
    { prop: 'line-gap-override', value: '0%' },
  ],
});

const mono = Roboto_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'OpenProtein.AI docs',
    template: '%s · OpenProtein.AI docs',
  },
  description:
    'Documentation for the OpenProtein.AI platform, Python API and REST API.',
  icons: { icon: `${BASE_PATH}/favicon.ico` },
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href={`${BASE_PATH}/mathjax.css`} precedence="default" />
        <script dangerouslySetInnerHTML={{ __html: CLIENT_PREPAINT }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans">
        <Provider>
          {children}
          <SiteFooter />
        </Provider>
        {SITE.gaId ? <GoogleAnalytics gaId={SITE.gaId} /> : null}
      </body>
    </html>
  );
}
