'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSession } from '@/components/auth/session-provider';
import { LoadingSection } from '@/components/site/loader';
import { NotFoundView } from '@/components/site/not-found';
import { canUseEditor } from '@/lib/editor/access';

const MdxEditor = dynamic(() => import('./mdx-editor').then((m) => m.MdxEditor), { ssr: false });

/** Anyone but signed-in staff gets the site's 404. */
export function EditorGate() {
  const session = useSession();
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const checking = session.status === 'checking' && session.reachable;
  const staff = session.status === 'signed-in' && canUseEditor(session.email);
  if (!checking && !staff) return <NotFoundView />;

  // One loader for check, bundle and source.
  return (
    <>
      {ready ? null : (
        <LoadingSection
          data-op-editor
          label="Loading the editor"
          className="h-[calc(100dvh-var(--fd-nav-height))]"
        />
      )}
      {staff ? <MdxEditor onReady={onReady} /> : null}
    </>
  );
}
