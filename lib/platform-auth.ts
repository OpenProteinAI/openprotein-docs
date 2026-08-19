import 'server-only';
import { IS_PROD, apiUrl } from '@/lib/env';

/** The gateway rejects FastAPI's lowercase "bearer" with a 401 before the API sees it. */
export const BEARER = 'Bearer';

/** Re-scoped refresh/CSRF cookies are sent to these three routes and to no page request. */
export const AUTH_COOKIE_PATH = '/api/auth';

export interface PlatformToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  csrf?: string;
}

export interface PlatformUser {
  username: string;
  active: boolean;
  role: string;
}

export interface PlatformCall<T> {
  data: T;
  upstream: Response;
}

export class PlatformError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PlatformError';
    this.status = status;
  }
}

export function authHeader(accessToken: string): string {
  return `${BEARER} ${accessToken}`;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function messageOf(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) {
    const parts = value.map(messageOf).filter((part): part is string => Boolean(part));
    return parts.length ? parts.join('; ') : null;
  }
  const obj = record(value);
  if (!obj) return null;
  return messageOf(obj.detail ?? obj.msg ?? obj.message);
}

async function detailOf(res: Response): Promise<string | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    try {
      return messageOf(JSON.parse(text) as unknown);
    } catch {
      return text.slice(0, 300).trim() || null;
    }
  } catch {
    return null;
  }
}

async function fail(res: Response, fallback: string): Promise<PlatformError> {
  if (res.status >= 300 && res.status < 400) {
    return new PlatformError(`${fallback} (upstream redirected to ${res.headers.get('location') ?? 'elsewhere'})`, res.status);
  }
  return new PlatformError((await detailOf(res)) ?? `${fallback} (HTTP ${res.status})`, res.status);
}

function toToken(value: unknown): PlatformToken {
  const obj = record(value);
  const accessToken = obj?.access_token;
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new PlatformError('The platform returned no access token.', 502);
  }
  const expiresIn = Number(obj?.expires_in);
  return {
    access_token: accessToken,
    token_type: typeof obj?.token_type === 'string' ? obj.token_type : BEARER,
    expires_in: Number.isFinite(expiresIn) ? expiresIn : 0,
    csrf: typeof obj?.csrf === 'string' ? obj.csrf : undefined,
  };
}

/** QUIRK 2: strip Domain/Secure and re-path, or the first access-token expiry logs the user out. */
export function localiseSetCookie(value: string): string {
  const parts = value
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return value;

  const out = [parts[0]];
  let pathed = false;

  for (const attr of parts.slice(1)) {
    const name = attr.split('=')[0].trim().toLowerCase();
    // A Domain=.openprotein.ai cookie is rejected outright on a localhost origin.
    if (name === 'domain') continue;
    if (name === 'secure' && !IS_PROD) continue;
    if (name === 'path') {
      out.push(`Path=${AUTH_COOKIE_PATH}`);
      pathed = true;
      continue;
    }
    out.push(attr);
  }

  if (!pathed) out.push(`Path=${AUTH_COOKIE_PATH}`);
  return out.join('; ');
}

export function forwardCookies(from: Response, to: Headers): void {
  for (const cookie of from.headers.getSetCookie()) {
    to.append('set-cookie', localiseSetCookie(cookie));
  }
}

export async function login(username: string, password: string): Promise<PlatformCall<PlatformToken>> {
  const form = new FormData();
  form.set('grant_type', 'password');
  form.set('username', username);
  form.set('password', password);

  const upstream = await fetch(apiUrl('auth/login'), {
    method: 'POST',
    body: form,
    // A followed redirect swallows the Set-Cookie headers we have to re-scope.
    redirect: 'manual',
    cache: 'no-store',
  });

  if (!upstream.ok) throw await fail(upstream, 'Sign-in failed.');
  return { data: toToken(await upstream.json()), upstream };
}

export async function fetchUser(accessToken: string): Promise<PlatformUser> {
  const res = await fetch(apiUrl('users/me'), {
    headers: { authorization: authHeader(accessToken), accept: 'application/json' },
    cache: 'no-store',
  });

  if (!res.ok) throw await fail(res, 'Could not load your account.');

  const obj = record(await res.json());
  if (typeof obj?.username !== 'string' || !obj.username) {
    throw new PlatformError('The platform returned no username.', 502);
  }
  return {
    username: obj.username,
    active: obj.active !== false,
    role: typeof obj.role === 'string' ? obj.role : 'user',
  };
}

function authBody(cookie: string, csrf?: string): RequestInit {
  const headers = new Headers({ 'content-type': 'application/json', accept: 'application/json' });
  if (cookie) headers.set('cookie', cookie);
  if (csrf) headers.set('x-csrf-token', csrf);
  return { method: 'POST', headers, body: '{}', redirect: 'manual', cache: 'no-store' };
}

export async function refresh(cookie: string, csrf?: string): Promise<PlatformCall<PlatformToken>> {
  const upstream = await fetch(apiUrl('auth/refresh'), authBody(cookie, csrf));
  if (!upstream.ok) throw await fail(upstream, 'Your session could not be refreshed.');
  return { data: toToken(await upstream.json()), upstream };
}

/** Best effort: the local cookies are cleared whatever upstream says. */
export async function logout(cookie: string, csrf?: string): Promise<Response | null> {
  try {
    return await fetch(apiUrl('auth/logout'), authBody(cookie, csrf));
  } catch {
    return null;
  }
}
