import { AUTH } from './config';

/** Where the app sends the browser back with the code. */
export const CALLBACK_PATH = '/auth/callback';
const PENDING = 'op-docs-handoff';

interface Pending {
  verifier: string;
  state: string;
  returnTo: string;
}

/** Docs on its own API origin is local docs behind `pnpm dev`'s proxy, which can't read the app's cookies. */
export function usesHandoff(): boolean {
  return AUTH.enabled && AUTH.apiOrigin === location.origin;
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function random(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

async function challengeOf(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** A page on this origin other than the callback, else the home page. */
function landing(url: string): string {
  try {
    const target = new URL(url, location.origin);
    const path = target.pathname.replace(/\/$/, '');
    if (target.origin === location.origin && path !== CALLBACK_PATH) return target.href;
  } catch {
    // not a URL
  }
  return new URL('/', location.origin).href;
}

/** The app signs the browser in, then returns a single-use code to the callback. */
export async function startHandoff(returnTo: string): Promise<void> {
  const pending: Pending = { verifier: random(), state: random(), returnTo: landing(returnTo) };
  try {
    sessionStorage.setItem(PENDING, JSON.stringify(pending));
  } catch {
    // Blocked storage: the callback finds nothing to match and says sign-in failed.
  }
  const query = new URLSearchParams({
    return_to: new URL(CALLBACK_PATH, location.origin).href,
    code_challenge: await challengeOf(pending.verifier),
    state: pending.state,
  });
  location.assign(`${AUTH.appUrl}/auth/docs?${query}`);
}

function takePending(): Pending | null {
  try {
    const raw = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

let finishing: Promise<{ ok: boolean; returnTo: string }> | null = null;

/** Spend the code the app returned, once per page load: strict mode mounts the callback twice. */
export function finishHandoff(): Promise<{ ok: boolean; returnTo: string }> {
  finishing ??= (async () => {
    const params = new URLSearchParams(location.search);
    const pending = takePending();
    const returnTo = landing(pending?.returnTo ?? '/');
    const code = params.get('code');
    if (!pending || !code || params.get('state') !== pending.state) return { ok: false, returnTo };
    try {
      const res = await fetch(`${AUTH.apiUrl}/auth/handoff/exchange`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          code,
          code_verifier: pending.verifier,
          redirect_uri: new URL(CALLBACK_PATH, location.origin).href,
        }),
        cache: 'no-store',
      });
      return { ok: res.ok, returnTo };
    } catch {
      return { ok: false, returnTo };
    }
  })();
  return finishing;
}
