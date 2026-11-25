import { endSession, fetchUser, mintToken, readSession } from './api';
import { AUTH } from './config';
import { startHandoff, usesHandoff } from './handoff';

export type SessionStatus = 'disabled' | 'checking' | 'signed-out' | 'signed-in' | 'sign-out-failed';

export interface SessionView {
  status: SessionStatus;
  userId: number | null;
  username: string | null;
  email: string | null;
  /** False from a failed check or mint until one succeeds. */
  reachable: boolean;
  /** True from a tab coming back until its next check completes. */
  resuming: boolean;
  /** Bumps when a signed-in account changes or ends, so UI scoped to it remounts. */
  epoch: number;
}

const INITIAL: SessionView = {
  status: AUTH.enabled ? 'checking' : 'disabled',
  userId: null,
  username: null,
  email: null,
  reachable: true,
  resuming: false,
  epoch: 0,
};

let view = INITIAL;
// Memory only: the platform keeps the refresh token in its own HttpOnly cookie.
let token: { value: string; expiresAt: number } | null = null;
let checking: Promise<void> | null = null;
let signingOut = false;
// Bumped by forget(): a call that started before it drops its result.
let generation = 0;
const listeners = new Set<() => void>();

const RENEW_MARGIN_MS = 60_000;
const SIGN_OUT_PENDING = 'op-docs-sign-out-pending';
let renewal: ReturnType<typeof setTimeout> | null = null;
let renewing: Promise<string | null> | null = null;

function scheduleRenewal(): void {
  if (renewal) clearTimeout(renewal);
  renewal = token
    ? setTimeout(() => void accessToken(), Math.max(token.expiresAt - RENEW_MARGIN_MS - Date.now(), 1_000))
    : null;
}

/** Blocked storage throws on access; then a failed sign-out holds only until the page unloads. */
function signOutPending(): boolean {
  try {
    return sessionStorage.getItem(SIGN_OUT_PENDING) !== null;
  } catch {
    return false;
  }
}

function markSignOutPending(pending: boolean): void {
  try {
    if (pending) sessionStorage.setItem(SIGN_OUT_PENDING, '1');
    else sessionStorage.removeItem(SIGN_OUT_PENDING);
  } catch {
    // See signOutPending.
  }
}

/** Drop the token and the account; UI scoped to the account remounts if there was one. */
function forget(status: SessionStatus): void {
  generation += 1;
  token = null;
  scheduleRenewal();
  update({
    status,
    userId: null,
    username: null,
    email: null,
    reachable: true,
    epoch: view.userId === null ? view.epoch : view.epoch + 1,
  });
}

function update(next: Partial<SessionView>): void {
  view = { ...view, ...next };
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getView(): SessionView {
  return view;
}

/** What a prerendered page shows before the first check, so hydration matches. */
export function getServerView(): SessionView {
  return INITIAL;
}

async function mint(): Promise<void> {
  let current = generation;
  const result = await mintToken();
  if (current !== generation) return;
  if (result.kind === 'unreachable') return update({ reachable: false });
  if (result.kind === 'signed-out') return forget('signed-out');
  if (view.userId !== null && result.userId !== view.userId) {
    forget('checking');
    current = generation;
  }
  token = { value: result.accessToken, expiresAt: Date.now() + result.expiresIn * 1000 };
  scheduleRenewal();
  const user =
    result.userId === view.userId
      ? { username: view.username, email: view.email }
      : await fetchUser(result.accessToken);
  if (current !== generation) return;
  update({ status: 'signed-in', userId: result.userId, ...user, reachable: true });
}

/** Ask the platform who this browser is signed in as, and sign docs in as them. */
export function check(): Promise<void> {
  if (!AUTH.enabled || signingOut || view.status === 'sign-out-failed') return Promise.resolve();
  checking ??= (async () => {
    const current = generation;
    const result = await readSession();
    if (current !== generation) return;
    if (result.kind === 'unreachable') return update({ reachable: false });
    if (!result.authenticated) return forget('signed-out');
    if (view.status === 'signed-in' && result.userId === view.userId) return update({ reachable: true });
    // Another account: hide this one before the next is shown.
    if (view.status === 'signed-in') forget('checking');
    await mint();
  })().finally(() => {
    checking = null;
    if (view.resuming) update({ resuming: false });
  });
  return checking;
}

/** A token with over a minute left, renewed first when needed; null when docs may not act. */
export async function accessToken(): Promise<string | null> {
  if (view.status !== 'signed-in' || !view.reachable || view.resuming || !token) return null;
  if (token.expiresAt - Date.now() > RENEW_MARGIN_MS) return token.value;
  const current = generation;
  renewing ??= mint()
    .then(() => (view.status === 'signed-in' ? (token?.value ?? null) : null))
    .finally(() => {
      renewing = null;
    });
  const renewed = await renewing;
  // A token for the account the caller started under, or none.
  return current === generation ? renewed : null;
}

/** The platform answered 401: recheck the session, and renew the token before it is sent again. */
export function tokenRejected(): Promise<void> {
  if (token) token = { ...token, expiresAt: 0 };
  return check();
}

/** Check now, then whenever the tab is focused, comes back or reconnects. */
export function start(): () => void {
  if (!AUTH.enabled) return () => {};
  // A failed sign-out holds, across reloads of this tab, until Retry succeeds.
  if (signOutPending()) update({ status: 'sign-out-failed' });
  else void check();
  const recheck = () => void check();
  const resume = () => {
    if (view.status === 'signed-in') update({ resuming: true });
    void check();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') resume();
  };
  const onPageShow = (event: PageTransitionEvent) => {
    if (event.persisted) resume();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('focus', recheck);
  window.addEventListener('online', resume);
  return () => {
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('focus', recheck);
    window.removeEventListener('online', resume);
  };
}

/** The app signs the browser in, then sends it back to this page. */
export function signIn(): void {
  if (usesHandoff()) return void startHandoff(location.href);
  location.assign(`${AUTH.appUrl}/auth/docs?return_to=${encodeURIComponent(location.href)}`);
}

/** End this browser's session, then let the app finish, SSO broker logout included. */
export async function signOut(): Promise<void> {
  const returnTo = location.href;
  signingOut = true;
  forget('checking');
  const ended = await endSession();
  signingOut = false;
  if (!ended) {
    markSignOutPending(true);
    return update({ status: 'sign-out-failed' });
  }
  markSignOutPending(false);
  location.assign(`${AUTH.appUrl}/auth/signed-out?return_to=${encodeURIComponent(returnTo)}`);
}
