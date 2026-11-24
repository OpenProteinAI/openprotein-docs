'use client';

import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { SessionBanner } from '@/components/auth/session-banner';
import { SessionProvider } from '@/components/auth/session-provider';
import { MathCopyMenu } from '@/components/site/math-copy-menu';
import { OpSearchDialog } from '@/components/site/search-dialog';

/** SearchDialog is a function prop, so the provider must be a client component. */
export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ hotKey: false }} search={{ SearchDialog: OpSearchDialog }}>
      <SessionProvider>
        {children}
        <SessionBanner />
        <MathCopyMenu />
      </SessionProvider>
    </RootProvider>
  );
}
