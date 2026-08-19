'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/** Declared here rather than imported: lib/session.ts is server-only and must not be bundled. */
export interface ClientSession {
  username: string;
  expiresAt: number;
}

const SessionContext = createContext<ClientSession | null>(null);

/**
 * Reading cookies in the root layout would make every page dynamic, so by default this
 * fetches once on mount. Pass `value` to render server-side instead (needs cacheComponents).
 */
export function SessionProvider({
  value,
  children,
}: {
  value?: ClientSession | null;
  children: ReactNode;
}) {
  const [fetched, setFetched] = useState<ClientSession | null>(null);

  useEffect(() => {
    if (value !== undefined) return;
    let live = true;
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => live && setFetched(s))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [value]);

  return (
    <SessionContext.Provider value={value ?? fetched}>{children}</SessionContext.Provider>
  );
}

export function useSession(): ClientSession | null {
  return useContext(SessionContext);
}
