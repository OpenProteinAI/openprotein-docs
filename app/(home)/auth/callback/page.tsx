import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HandoffCallback } from '@/components/auth/handoff-callback';
import { AUTH } from '@/lib/auth/config';
import { SITE } from '@/lib/site';

export const metadata: Metadata = { title: 'Logging in', robots: { index: false } };

export default function Page() {
  // Only local docs, whose API is its own origin, signs in through a handoff.
  if (!AUTH.enabled || new URL(SITE.url).origin !== AUTH.apiOrigin) notFound();
  return <HandoffCallback />;
}
