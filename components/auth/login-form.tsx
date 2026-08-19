'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LoaderCircle } from 'lucide-react';
import { Button } from '@/components/site/button';

const FIELD =
  'h-[35px] w-full rounded-[0.75em] border border-fd-border bg-fd-background px-3 text-sm text-fd-foreground transition-colors placeholder:text-fd-muted-foreground focus-visible:border-fd-primary focus-visible:outline-none disabled:opacity-60';

const LABEL = 'mb-1.5 block text-sm font-medium text-fd-foreground';

const GENERIC = 'Sign-in failed. Check your username and password.';

function messageOf(body: unknown): string {
  const data = body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  const error = data?.error;
  return typeof error === 'string' && error.trim() ? error : GENERIC;
}

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
        cache: 'no-store',
      });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setError(messageOf(body));
        setPending(false);
        return;
      }

      setPassword('');
      router.refresh();
      router.push('/');
    } catch {
      setError('Could not reach the sign-in service. Please try again.');
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="op-username" className={LABEL}>
          Username
        </label>
        <input
          id="op-username"
          name="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={pending}
          className={FIELD}
        />
      </div>

      <div>
        <label htmlFor="op-password" className={LABEL}>
          Password
        </label>
        <input
          id="op-password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          disabled={pending}
          className={FIELD}
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-[0.75em] border border-[color-mix(in_oklab,var(--color-fd-error)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-fd-error)_8%,transparent)] px-3 py-2 text-sm text-fd-foreground"
        >
          {error}
        </p>
      ) : null}

      <Button variant="main" type="submit" disabled={pending} className="w-full disabled:opacity-70">
        {pending ? <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" /> : null}
        {pending ? 'Signing in…' : 'Log in'}
      </Button>
    </form>
  );
}
