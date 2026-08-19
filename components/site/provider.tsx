'use client';

import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { OpSearchDialog } from '@/components/site/search-dialog';

/** SearchDialog is a function prop, so the provider must be a client component. */
export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider theme={{ hotKey: false }} search={{ SearchDialog: OpSearchDialog }}>
      {children}
    </RootProvider>
  );
}
