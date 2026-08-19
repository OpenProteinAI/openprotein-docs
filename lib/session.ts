import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { IS_PROD } from '@/lib/env';
import { BEARER, type PlatformToken, type PlatformUser } from '@/lib/platform-auth';

export const SESSION_COOKIE = 'op_docs_session';

/** Treat a token as spent this far ahead of expiry, so an in-flight call cannot race it. */
export const EXPIRY_MARGIN_MS = 30_000;

const SESSION_TTL = '7d';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const ACCESS_FALLBACK_MS = 900_000;

export interface DocsSession {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  csrf?: string;
  username: string;
}

/** Everything a client component may see — the token and CSRF value never cross. */
export type PublicSession = Pick<DocsSession, 'username' | 'expiresAt'>;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: IS_PROD,
  maxAge: SESSION_MAX_AGE,
} as const;

function key(): Uint8Array {
  const bytes = new TextEncoder().encode(process.env.DOCS_SESSION_SECRET ?? '');
  if (bytes.length < 32) {
    throw new Error('DOCS_SESSION_SECRET must be at least 32 bytes (openssl rand -base64 32).');
  }
  return bytes.slice(0, 32);
}

export async function seal(session: DocsSession): Promise<string> {
  return new EncryptJWT({
    accessToken: session.accessToken,
    tokenType: session.tokenType,
    expiresAt: session.expiresAt,
    csrf: session.csrf,
    username: session.username,
  })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .encrypt(key());
}

export async function unseal(value: string): Promise<DocsSession | null> {
  try {
    const { payload } = await jwtDecrypt(value, key(), {
      keyManagementAlgorithms: ['dir'],
      contentEncryptionAlgorithms: ['A256GCM'],
    });
    const accessToken = payload.accessToken;
    const username = payload.username;
    if (typeof accessToken !== 'string' || !accessToken) return null;
    if (typeof username !== 'string' || !username) return null;
    return {
      accessToken,
      tokenType: typeof payload.tokenType === 'string' ? payload.tokenType : BEARER,
      expiresAt: typeof payload.expiresAt === 'number' ? payload.expiresAt : 0,
      csrf: typeof payload.csrf === 'string' ? payload.csrf : undefined,
      username,
    };
  } catch {
    // Tampered, expired and rotated-secret all mean the same thing: no session.
    return null;
  }
}

export function toSession(token: PlatformToken, user: PlatformUser): DocsSession {
  const ttl = token.expires_in > 0 ? token.expires_in * 1000 : ACCESS_FALLBACK_MS;
  return {
    accessToken: token.access_token,
    tokenType: BEARER,
    expiresAt: Date.now() + ttl,
    csrf: token.csrf,
    username: user.username,
  };
}

export function isExpired(session: DocsSession, marginMs = EXPIRY_MARGIN_MS): boolean {
  return session.expiresAt - marginMs <= Date.now();
}

export const getSession = cache(async (): Promise<DocsSession | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  return value ? unseal(value) : null;
});

export const getPublicSession = cache(async (): Promise<PublicSession | null> => {
  const session = await getSession();
  return session ? { username: session.username, expiresAt: session.expiresAt } : null;
});

export async function setSessionCookie(session: DocsSession): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, await seal(session), SESSION_COOKIE_OPTIONS);
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete({ name: SESSION_COOKIE, path: '/' });
}
