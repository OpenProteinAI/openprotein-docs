'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, LogOut } from 'lucide-react';
import { useSession } from '@/components/auth/session-provider';
import { Button } from '@/components/site/button';
import { signOut } from '@/lib/auth/session';
import { withBase } from '@/lib/base-path';
import { SITE } from '@/lib/site';

// ps/pe align with the row above.
const ROW =
  'op-menu-item m-1 pe-3.25 text-fd-primary hover:bg-fd-primary/10 focus-visible:bg-fd-primary/10 focus-visible:outline-none active:bg-fd-primary/20';

export function SessionMenu({ className }: { className?: string }) {
  const session = useSession();
  const [open, setOpen] = useState(false);
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

  if (session.status !== 'signed-in') return null;

  const name = session.username ?? 'your account';
  const initial = session.username?.trim().slice(0, 1).toUpperCase() || '?';

  return (
    <div ref={root} className={['relative shrink-0', className].filter(Boolean).join(' ')}>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${name}`}
        onClick={() => setOpen((value) => !value)}
        style={{ background: 'var(--color-fd-accent)' }}
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-dark transition-[filter] hover:brightness-108 focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background focus-visible:outline-none"
      >
        <span aria-hidden>{initial}</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Account"
          className="absolute top-[calc(100%+0.375rem)] right-0 z-50 w-60 overflow-hidden rounded-[0.75em] border border-fd-border bg-fd-popover shadow-lg"
        >
          <div className="flex items-center gap-2 border-b border-fd-border py-2 ps-3 pe-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-fd-muted-foreground">Logged in as</p>
              <p className="truncate text-sm font-medium text-fd-foreground">{name}</p>
            </div>
            <Button
              variant="flat"
              role="menuitem"
              title="Log out"
              aria-label="Log out"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="shrink-0 px-2"
            >
              <LogOut className="size-[0.9375rem]" />
            </Button>
          </div>

          <a
            href={SITE.appUrl}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={ROW}
          >
            <img src={withBase('/logo.svg')} alt="" width={19} height={19} />
            <span>Open App</span>
            <ExternalLink className="ms-auto" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
