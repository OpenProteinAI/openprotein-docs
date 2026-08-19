'use client';

import { useSession } from '@/components/auth/session-provider';
import { SessionRefresher } from '@/components/auth/session-refresher';

/** Only poll once a session is actually known. */
export function SessionRefresh() {
  const session = useSession();
  return session ? <SessionRefresher expiresAt={session.expiresAt} /> : null;
}
