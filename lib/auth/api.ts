import { AUTH } from './config';

export type SessionRead =
  | { kind: 'unreachable' }
  | { kind: 'read'; authenticated: false }
  | { kind: 'read'; authenticated: true; userId: number };

export type Minted =
  | { kind: 'unreachable' }
  | { kind: 'signed-out' }
  | { kind: 'token'; accessToken: string; expiresIn: number; userId: number };

/** The platform answers these from its own HttpOnly cookies, which docs never sees. */
async function withCookies(path: string, method: 'GET' | 'POST'): Promise<Response | null> {
  try {
    return await fetch(`${AUTH.apiUrl}${path}`, { method, credentials: 'include', cache: 'no-store' });
  } catch {
    return null;
  }
}

async function body(res: Response): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await res.json();
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function readSession(): Promise<SessionRead> {
  const res = await withCookies('/auth/session', 'GET');
  const data = res?.ok ? await body(res) : null;
  if (data?.authenticated === false) return { kind: 'read', authenticated: false };
  if (data?.authenticated === true && Number.isInteger(data.user_id)) {
    return { kind: 'read', authenticated: true, userId: data.user_id as number };
  }
  return { kind: 'unreachable' };
}

export async function mintToken(): Promise<Minted> {
  const res = await withCookies('/auth/docs/session', 'POST');
  if (res?.status === 401) return { kind: 'signed-out' };
  const data = res?.ok ? await body(res) : null;
  const expiresIn = Number(data?.expires_in);
  if (
    typeof data?.access_token === 'string' &&
    data.access_token &&
    Number.isInteger(data.user_id) &&
    expiresIn > 0
  ) {
    return { kind: 'token', accessToken: data.access_token, expiresIn, userId: data.user_id as number };
  }
  return { kind: 'unreachable' };
}

export interface UserProfile {
  username: string | null;
  email: string | null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export async function fetchUser(accessToken: string): Promise<UserProfile> {
  try {
    const res = await fetch(`${AUTH.apiUrl}/users/me`, {
      // The gateway rejects FastAPI's lowercase "bearer".
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'omit',
      cache: 'no-store',
    });
    const data = res.ok ? await body(res) : null;
    return { username: text(data?.username), email: text(data?.email) };
  } catch {
    return { username: null, email: null };
  }
}

export async function endSession(): Promise<boolean> {
  const res = await withCookies('/auth/docs/logout', 'POST');
  return res?.status === 204;
}
