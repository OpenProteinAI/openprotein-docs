'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { getServerView, getView, start, subscribe, type SessionView } from '@/lib/auth/session';

export function SessionProvider({ children }: { children: ReactNode }) {
  useEffect(() => start(), []);
  return children;
}

export function useSession(): SessionView {
  return useSyncExternalStore(subscribe, getView, getServerView);
}
