import { NextResponse } from 'next/server';
import { ALLOWED_API_ORIGINS } from '@/lib/env';
import { openapi } from '@/lib/openapi';
import { authHeader, forwardCookies, refresh } from '@/lib/platform-auth';
import { type DocsSession, getSession, isExpired, setSessionCookie, toSession } from '@/lib/session';

// The bearer token comes from a per-request cookie, so nothing here may be prerendered or cached.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'cache-control': 'private, no-store' };
const ANONYMOUS = 'Sign in to run requests against the API.';
const STALE = 'Your session expired and could not be refreshed. Sign in again to run requests.';

/** RequestInit lacks `duplex`, which undici requires to send a streamed body. */
type StreamInit = RequestInit & { duplex?: 'half' };

function unauthorised(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 401, headers: NO_STORE });
}

function attach(session: DocsSession, request: Request): Request {
  const headers = new Headers(request.headers);
  // The shipped proxy forwards every inbound header, plus any attacker-supplied `?cookie=`.
  headers.delete('cookie');
  headers.delete('x-forwarded-for');
  headers.set('Authorization', authHeader(session.accessToken));

  const init: StreamInit = {
    method: request.method,
    headers,
    body: request.body,
    redirect: request.redirect,
    duplex: 'half',
  };
  return new Request(request.url, init);
}

/** The old site's responseInterceptor did the same: some endpoints answer json5. */
function asJson(response: Response): Response {
  const type = response.headers.get('content-type');
  if (!type?.includes('application/json5')) return response;

  const headers = new Headers(response.headers);
  headers.set('content-type', type.replace('application/json5', 'application/json'));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Built per request: overrides.request is synchronous and so cannot await the session itself.
function proxyFor(session: DocsSession) {
  return openapi.createProxy({
    allowedOrigins: [...ALLOWED_API_ORIGINS],
    overrides: {
      request: (request) => attach(session, request),
      response: asJson,
    },
  });
}

function withRotatedCookies(res: Response, upstream: Response): Response {
  const headers = new Headers(res.headers);
  forwardCookies(upstream, headers);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

async function handle(req: Request): Promise<Response> {
  let session = await getSession();
  if (!session) return unauthorised(ANONYMOUS);

  let rotated: Response | null = null;
  if (isExpired(session)) {
    try {
      // Platform refresh tokens are single-use and rotating: exactly one attempt per request.
      const call = await refresh(req.headers.get('cookie') ?? '', session.csrf);
      session = {
        ...toSession(call.data, { username: session.username, active: true, role: 'user' }),
        // Refresh often omits csrf, and dropping it leaves the *next* refresh unauthenticated.
        csrf: call.data.csrf ?? session.csrf,
      };
      await setSessionCookie(session);
      rotated = call.upstream;
    } catch {
      return unauthorised(STALE);
    }
  }

  const res = await proxyFor(session).handle(req);
  return rotated ? withRotatedCookies(res, rotated) : res;
}

export const GET = handle;
export const HEAD = handle;
export const PUT = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
