import { NextResponse } from 'next/server';
import {
  fetchUser,
  forwardCookies,
  refresh,
  type PlatformCall,
  type PlatformToken,
  type PlatformUser,
} from '@/lib/platform-auth';
import { clearSessionCookie, getSession, setSessionCookie, toSession } from '@/lib/session';

const NO_STORE = { 'cache-control': 'private, no-store' };

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'No session.' }, { status: 401, headers: NO_STORE });
  }

  let call: PlatformCall<PlatformToken>;
  try {
    call = await refresh(req.headers.get('cookie') ?? '', session.csrf);
  } catch {
    await clearSessionCookie();
    return NextResponse.json({ error: 'Session expired.' }, { status: 401, headers: NO_STORE });
  }

  let user: PlatformUser = { username: session.username, active: true, role: 'user' };
  try {
    user = await fetchUser(call.data.access_token);
  } catch {
    // Non-fatal: a fresh token under the name we already hold beats signing the user out.
  }

  const next = {
    ...toSession(call.data, user),
    // Refresh often omits csrf, and dropping it leaves the *next* refresh unauthenticated.
    csrf: call.data.csrf ?? session.csrf,
  };
  await setSessionCookie(next);

  // expiresAt goes back so the client poller can schedule the next refresh.
  const res = NextResponse.json(
    { username: next.username, expiresAt: next.expiresAt },
    { headers: NO_STORE },
  );
  forwardCookies(call.upstream, res.headers);
  return res;
}
