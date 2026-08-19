import { NextResponse } from 'next/server';
import { forwardCookies, logout } from '@/lib/platform-auth';
import { clearSessionCookie, getSession } from '@/lib/session';

const NO_STORE = { 'cache-control': 'private, no-store' };
const EPOCH = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT';

/** Next re-serialises Set-Cookie and drops Max-Age=0, so pin an epoch expiry on cleared cookies. */
function expireCleared(headers: Headers): void {
  const cookies = headers.getSetCookie();
  if (!cookies.length) return;
  headers.delete('set-cookie');
  for (const cookie of cookies) {
    headers.append('set-cookie', /^[^=]+=(;|$)/.test(cookie) ? `${cookie}; ${EPOCH}` : cookie);
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  const res = NextResponse.json({ ok: true }, { headers: NO_STORE });

  if (session) {
    // logout() swallows its own failures, so a dead upstream cannot strand a signed-in cookie.
    const upstream = await logout(req.headers.get('cookie') ?? '', session.csrf);
    if (upstream) forwardCookies(upstream, res.headers);
    expireCleared(res.headers);
  }

  await clearSessionCookie();
  return res;
}
