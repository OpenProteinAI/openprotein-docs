'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

/** Declared here rather than imported: lib/session.ts is server-only and must not be bundled. */
export interface ClientSession {
  username: string;
  expiresAt: number;
}

const SessionContext = createContext<ClientSession | null>(null);
const ReloadContext = createContext<() => Promise<ClientSession | null>>(async () => null);

async function read(): Promise<ClientSession | null> {
  try {
    const res = await fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    return res.ok ? ((await res.json()) as ClientSession | null) : null;
  } catch {
    return null;
  }
}

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
  // undefined = the client has not looked yet; null = it looked, and nobody is signed in.
  const [client, setClient] = useState<ClientSession | null | undefined>(undefined);

  const reload = useCallback(async () => {
    const session = await read();
    setClient(session);
    return session;
  }, []);

  useEffect(() => {
    if (value !== undefined) return;
    void reload();
  }, [value, reload]);

  return (
    <ReloadContext.Provider value={reload}>
      <SessionContext.Provider value={client !== undefined ? client : (value ?? null)}>
        {children}
      </SessionContext.Provider>
    </ReloadContext.Provider>
  );
}

export function useSession(): ClientSession | null {
  return useContext(SessionContext);
}

/**
 * Re-read /api/auth/session. Signing in and out has to call this: the provider lives in
 * the root layout, so it never remounts, and `router.refresh()` re-renders the server
 * tree without re-running a client effect - which left the header a refresh behind.
 */
export function useReloadSession(): () => Promise<ClientSession | null> {
  return useContext(ReloadContext);
}
