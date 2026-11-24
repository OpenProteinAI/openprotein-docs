'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/site/button';
import { finishHandoff, startHandoff } from '@/lib/auth/handoff';

const HEADING = 'mb-3 text-3xl font-bold tracking-tight text-fd-foreground';
const LEAD = 'mb-8 max-w-[62ch] text-base leading-prose text-fd-muted-foreground';

/** Spends the app's code, then goes back to the page Log in was clicked on. */
export function HandoffCallback() {
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    void finishHandoff().then(({ ok, returnTo }) => {
      if (ok) location.replace(returnTo);
      else setFailed(returnTo);
    });
  }, []);

  return (
    <main className="w-full px-8 py-20">
      {failed === null ? (
        <h1 className={HEADING}>Logging you in…</h1>
      ) : (
        <div role="alert">
          <h1 className={HEADING}>Login failed</h1>
          <p className={LEAD}>Docs couldn't finish logging you in. Try again, or carry on logged out.</p>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="main" onClick={() => void startHandoff(failed)}>
              Try again
            </Button>
            <Button variant="secondary" href={failed}>
              Back to the docs
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
