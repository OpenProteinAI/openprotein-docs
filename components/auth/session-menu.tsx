'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, CreditCard, KeyRound, LayoutDashboard, LogOut } from 'lucide-react';
import { useSession } from '@/components/auth/session-provider';

const PLATFORM = 'https://app.openprotein.ai';

const ROWS = [
  { label: 'Workspace dashboard', href: PLATFORM, icon: LayoutDashboard },
  { label: 'API keys', href: `${PLATFORM}/account/api-keys`, icon: KeyRound },
  { label: 'Usage & billing', href: `${PLATFORM}/account/billing`, icon: CreditCard },
];

const ROW =
  'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-fd-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground';

export function SessionMenu({ className }: { className?: string }) {
  const session = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Signed out: the header renders its own Log in button.
  if (!session) return null;

  const initial = session.username.trim().slice(0, 1).toUpperCase() || '?';

  async function signOut() {
    setOpen(false);
    setPending(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
    } catch {
      // Best effort: the cookies are cleared server-side, so fall through to the refresh.
    }
    setPending(false);
    router.refresh();
  }

  return (
    <div ref={root} className={['relative shrink-0', className].filter(Boolean).join(' ')}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${session.username}`}
        onClick={() => setOpen((value) => !value)}
        className="flex h-[34px] items-center gap-1 rounded-[0.75em] pr-0.5 text-fd-muted-foreground transition-colors hover:text-fd-foreground"
      >
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: 'var(--brand-gradient)' }}
        >
          {initial}
        </span>
        <ChevronDown className="size-[15px]" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute top-[calc(100%+6px)] right-0 z-50 w-60 overflow-hidden rounded-[0.75em] border border-fd-border bg-fd-popover shadow-lg"
        >
          <div className="border-b border-fd-border px-3 py-2.5">
            <p className="text-xs text-fd-muted-foreground">Signed in as</p>
            <p className="truncate text-sm font-medium text-fd-foreground">{session.username}</p>
          </div>

          {ROWS.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              role="menuitem"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={ROW}
            >
              <Icon className="size-4 shrink-0 text-fd-muted-foreground" />
              {label}
            </a>
          ))}

          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={pending}
            className={`${ROW} border-t border-fd-border disabled:opacity-60`}
          >
            <LogOut className="size-4 shrink-0 text-fd-muted-foreground" />
            {pending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
