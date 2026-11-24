'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, type LucideIcon } from 'lucide-react';

/**
 * Icon-only copy button, shared by the REST and Python API reference renderers.
 *
 * Icon-only because the rows it sits on already carry a verb, a path and a summary — two
 * text labels on every one of ninety-three rows would crowd out the path beside them. The
 * name is carried by `aria-label` and a native tooltip.
 *
 * Not fumadocs' `useCopyButton`, which ticks on `Promise.resolve(onCopy()).then()` with no
 * rejection branch: a failed write shows no checkmark and leaves an unhandled rejection, so
 * it is indistinguishable from a click that did nothing. The stronger reason is the
 * *synchronous* throw — `navigator.clipboard` is gated on a secure context, and `next dev`
 * prints a plain-http LAN URL people preview from, where it is `undefined`.
 */
export function CopyButton({
  label,
  icon: Icon,
  getText,
  className = '',
}: {
  label: string;
  icon: LucideIcon;
  getText: () => string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timeout.current), []);

  async function copy() {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable (insecure context?)');
      await navigator.clipboard.writeText(getText());
    } catch (error) {
      console.error(`[docs] ${label} failed`, error);
      return;
    }

    setCopied(true);
    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={label}
      className={`shrink-0 rounded-md p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none ${className}`}
    >
      {copied ? (
        <Check aria-hidden className="size-3.5 text-fd-primary" />
      ) : (
        <Icon aria-hidden className="size-3.5" />
      )}
    </button>
  );
}

/** origin + pathname + hash, not `location.href` with the hash swapped: the reader may have
 *  arrived on a URL that already carries a query string, and that does not belong in the link. */
export function anchorUrl(id: string): string {
  return `${window.location.origin}${window.location.pathname}#${id}`;
}
