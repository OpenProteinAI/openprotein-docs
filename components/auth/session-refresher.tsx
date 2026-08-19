'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const LOCK = 'op-refresh-token';

/** Ahead of the server's own 30s margin, so a render never picks up a spent token. */
const EXPIRY_MARGIN_MS = 60_000;

const FALLBACK_TTL_MS = 900_000;
const MIN_DELAY_MS = 1_000;
const RETRY_MS = 15_000;
const MAX_RETRIES = 3;

let chain: Promise<unknown> = Promise.resolve();

function serialise<T>(run: () => Promise<T>): Promise<T> {
  const next = chain.then(run, run);
  chain = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

/** Refresh tokens are single-use and rotating: a concurrent replay revokes the whole family. */
function withLock<T>(run: () => Promise<T>): Promise<T> {
  const locks = typeof navigator === 'undefined' ? undefined : navigator.locks;
  if (!locks) return serialise(run);
  return locks.request(LOCK, run) as Promise<T>;
}

function nextExpiry(body: unknown): number {
  const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  const at = Number(data?.expiresAt);
  if (Number.isFinite(at) && at > Date.now()) return at;
  const ttl = Number(data?.expires_in);
  if (Number.isFinite(ttl) && ttl > 0) return Date.now() + ttl * 1000;
  return Date.now() + FALLBACK_TTL_MS;
}

export function SessionRefresher({ expiresAt }: { expiresAt: number }) {
  const router = useRouter();
  const deadline = useRef(expiresAt);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    deadline.current = expiresAt;
    let cancelled = false;
    let stopped = false;
    let failures = 0;

    function clear() {
      if (timer.current === null) return;
      clearTimeout(timer.current);
      timer.current = null;
    }

    function after(delay: number) {
      clear();
      timer.current = setTimeout(() => {
        timer.current = null;
        void attempt();
      }, delay);
    }

    function schedule() {
      clear();
      if (cancelled || stopped) return;
      const at = deadline.current;
      if (!Number.isFinite(at) || at <= 0) return;
      after(Math.max(at - EXPIRY_MARGIN_MS - Date.now(), MIN_DELAY_MS));
    }

    // null means the platform refused: the refresh token is spent or revoked.
    async function refresh(): Promise<number | null> {
      const res = await fetch('/api/auth/refresh', { method: 'POST', cache: 'no-store' });
      if (res.status === 401 || res.status === 403) return null;
      if (!res.ok) throw new Error(`refresh unavailable (${res.status})`);
      return nextExpiry(await res.json().catch(() => null));
    }

    async function attempt() {
      if (cancelled || stopped) return;

      let result: number | null;
      try {
        result = await withLock(refresh);
      } catch {
        if (++failures > MAX_RETRIES) stopped = true;
        else after(RETRY_MS);
        return;
      }

      if (cancelled) return;
      if (result === null) {
        stopped = true;
        router.refresh();
        return;
      }

      failures = 0;
      deadline.current = result;
      schedule();
    }

    function onVisibility() {
      if (cancelled || stopped || document.visibilityState !== 'visible') return;
      // A backgrounded tab's timer fires late or not at all, so re-check on wake.
      if (deadline.current - EXPIRY_MARGIN_MS <= Date.now()) void attempt();
      else schedule();
    }

    schedule();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      clear();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [expiresAt, router]);

  return null;
}
