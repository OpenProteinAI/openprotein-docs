'use client';

import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { SessionProvider } from '@/components/auth/session-provider';
import { SessionRefresh } from '@/components/auth/session-refresh';
import { OpSearchDialog } from '@/components/site/search-dialog';

/** SearchDialog is a function prop, so the provider must be a client component. */
export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ hotKey: false }} search={{ SearchDialog: OpSearchDialog }}>
      <SessionProvider>
        {children}
        <SessionRefresh />
      </SessionProvider>
    </RootProvider>
  );
}
