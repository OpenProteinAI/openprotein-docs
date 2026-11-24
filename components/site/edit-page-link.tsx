'use client';

import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { useSession } from '@/components/auth/session-provider';
import { canUseEditor } from '@/lib/editor/access';
import { editPageHref } from '@/lib/editor/page';

/** Staff only: opens the page's source in the editor. */
export function EditPageLink({ url, className }: { url: string; className: string }) {
  const session = useSession();
  if (session.status !== 'signed-in' || !canUseEditor(session.email)) return null;
  return (
    <Link href={editPageHref(url)} target="_blank" className={className}>
      <Pencil className="size-3.5" />
      Edit this page
    </Link>
  );
}
