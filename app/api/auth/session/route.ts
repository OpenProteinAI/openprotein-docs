import { NextResponse } from 'next/server';
import { getPublicSession } from '@/lib/session';

// The only GET of the four: a prerendered shell here would hand one user's name to everybody.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getPublicSession(), {
    headers: { 'cache-control': 'private, no-store' },
  });
}
