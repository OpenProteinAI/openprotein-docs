import { NextResponse } from 'next/server';
import {
  PlatformError,
  fetchUser,
  forwardCookies,
  login,
  type PlatformCall,
  type PlatformToken,
  type PlatformUser,
} from '@/lib/platform-auth';
import { setSessionCookie, toSession } from '@/lib/session';

const NO_STORE = { 'cache-control': 'private, no-store' };
const MISSING = 'Enter your username and password.';

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function credentials(req: Request): Promise<{ username: string; password: string }> {
  try {
    if ((req.headers.get('content-type') ?? '').includes('application/json')) {
      const body = ((await req.json()) ?? {}) as Record<string, unknown>;
      return { username: str(body.username).trim(), password: str(body.password) };
    }
    const form = await req.formData();
    return { username: str(form.get('username')).trim(), password: str(form.get('password')) };
  } catch {
    // An unparseable body is a missing one.
    return { username: '', password: '' };
  }
}

/** A 0 or a 3xx echoed back as our own status would read as a redirect instead of a failure. */
function errorStatus(status: number): number {
  return status >= 400 && status <= 599 ? status : 502;
}

export async function POST(req: Request) {
  const { username, password } = await credentials(req);
  if (!username || !password) {
    return NextResponse.json({ error: MISSING }, { status: 400, headers: NO_STORE });
  }

  let call: PlatformCall<PlatformToken>;
  try {
    call = await login(username, password);
  } catch (err) {
    const status = err instanceof PlatformError ? err.status : 0;
    const error = err instanceof Error && err.message ? err.message : 'Sign-in failed.';
    return NextResponse.json({ error }, { status: errorStatus(status), headers: NO_STORE });
  }

  const token = call.data;
  let user: PlatformUser;
  try {
    user = await fetchUser(token.access_token);
  } catch (err) {
    const status = err instanceof PlatformError ? err.status : 0;
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`[auth] GET /users/me failed with ${status}: ${detail}`);
    const reason = status ? `HTTP ${status}` : 'the platform did not respond';
    return NextResponse.json(
      { error: `Signed in, but reading your account failed (${reason}).` },
      { status: 502, headers: NO_STORE },
    );
  }

  const session = toSession(token, user);
  await setSessionCookie(session);

  // Only the username crosses back: the access token stays inside the sealed cookie.
  const res = NextResponse.json({ username: session.username }, { headers: NO_STORE });
  forwardCookies(call.upstream, res.headers);
  return res;
}
