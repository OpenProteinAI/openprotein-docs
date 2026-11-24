'use client';

import { useSession } from '@/components/auth/session-provider';
import { Button } from '@/components/site/button';
import { signOut } from '@/lib/auth/session';

// Fixed to the viewport: the home header's menu root accepts a single child.
const STRIP =
  'fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-[0.75em] border border-fd-border bg-fd-popover px-4 py-2 text-fd-foreground shadow-lg';

/** Says why signed-in actions are paused, or that a sign-out needs another try. */
export function SessionBanner() {
  const session = useSession();
  if (session.status === 'sign-out-failed') {
    return (
      <div role="alert" className={STRIP}>
        Log out incomplete.
        <Button variant="text" onClick={() => void signOut()}>
          Retry
        </Button>
      </div>
    );
  }
  if (!session.reachable && (session.status === 'signed-in' || session.status === 'checking')) {
    return (
      <p role="status" className={STRIP}>
        Can't reach OpenProtein. Logged-in actions are paused until it answers.
      </p>
    );
  }
  return null;
}
