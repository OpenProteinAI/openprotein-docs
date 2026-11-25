'use client';

import { Fragment, type ReactNode } from 'react';
import { useSession } from '@/components/auth/session-provider';

/** Remounts its children when the signed-in account changes or ends, dropping what they hold. */
export function SessionScoped({ children }: { children: ReactNode }) {
  return <Fragment key={useSession().epoch}>{children}</Fragment>;
}
