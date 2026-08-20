'use client';

import { useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Copy, Link2 } from 'lucide-react';
import { CopyButton, anchorUrl } from '@/components/copy-button';
import { useHashTarget } from '@/components/use-hash-target';

/**
 * One `##` section of a reference page — Interface / Models / Results — as a collapsible
 * group, open by default. Same two-level shape as the REST reference: a full-width rule for
 * the group, bordered cards for the items, so the levels never read as one flat list.
 *
 * The heading is rendered here rather than in MDX so the group has a trigger to hang off;
 * the id is the same slug rehype-slug would have produced, so `#models` still resolves.
 */
export function PyGroup({
  id,
  title,
  anchors,
  children,
}: {
  id: string;
  title: string;
  /** The class paths inside; a deep link to any of them, or to one of their members, opens
   *  the group. Members are matched by dotted prefix rather than enumerated — the embeddings
   *  page would otherwise need 179 of them in its MDX. */
  anchors: string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(true);
  useHashTarget([id, ...anchors], () => setOpen(true), { descendants: true });
  const panelId = `${id}-content`;

  return (
    <section className="mt-10 first:mt-0">
      <h2
        id={id}
        className="not-prose m-0 scroll-mt-24 border-b border-fd-border text-xl font-normal"
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-baseline gap-2.5 py-3 text-start transition-colors hover:text-fd-primary focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:outline-none"
        >
          <ChevronDown
            aria-hidden
            className={`size-4 shrink-0 self-center text-fd-muted-foreground transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <span className="min-w-0 flex-1 font-semibold text-fd-foreground">{title}</span>
          <span className="shrink-0 self-center text-xs text-fd-muted-foreground tabular-nums">
            {anchors.length}
          </span>
        </button>
      </h2>
      {/* Mounted whether open or not. Unlike the REST playgrounds there is nothing expensive
          inside — it is static server-rendered HTML — and every member id has to stay in the
          DOM for fumadocs' TOC, which registers its anchors once via getElementById. */}
      <div id={panelId} role="group" aria-labelledby={id} className={open ? 'pt-4' : 'hidden'}>
        {children}
      </div>
    </section>
  );
}

/**
 * One class or function, collapsed by default: a reference page is a lookup surface, and
 * `openprotein.embeddings` expands to 179 members if everything is open at once.
 *
 * The header is always rendered, so the class anchor and the collapse state are independent
 * of the body — and a deep link to any member inside opens the card on arrival.
 */
export function PyCard({
  id,
  header,
  code,
  action,
  memberAnchors,
  children,
}: {
  id: string;
  header: ReactNode;
  /**
   * The header as plain text, for Copy code. The header itself lives inside the toggle
   * button, so a reader cannot select it — which is the whole reason this button exists.
   */
  code: string;
  /** Rendered as a sibling of the toggle — a link inside a button is invalid HTML. */
  action?: ReactNode;
  memberAnchors: string[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useHashTarget([id, ...memberAnchors], (hash) => {
    setOpen(true);
    // The browser's own fragment scroll ran while this card was still collapsed, so the
    // target had no box. By the next frame it does.
    requestAnimationFrame(() => {
      const element = hash === id ? heading.current : document.getElementById(hash);
      element?.scrollIntoView({ block: 'start' });
    });
  });

  const panelId = `${id}-content`;

  return (
    <div
      className={`mb-2 overflow-hidden rounded-xl border bg-fd-card transition-colors ${
        open ? 'border-fd-primary' : 'border-fd-border'
      }`}
    >
      {/* The anchor lives on this row, not the card: fumadocs' TOC tracks the active entry
          with an IntersectionObserver at a 0.9 threshold, and an expanded class is taller
          than the viewport so it would never qualify. */}
      <h3
        ref={heading}
        id={id}
        className="not-prose m-0 flex scroll-mt-24 items-start text-base font-normal transition-colors hover:bg-fd-accent/40 has-focus-visible:bg-fd-accent/40"
      >
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-start gap-2.5 px-4 py-3 text-start focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-inset focus-visible:outline-none"
        >
          <ChevronRight
            aria-hidden
            className={`mt-1 size-4 shrink-0 text-fd-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1">
            {header}
          </span>
        </button>

        {/* Siblings of the toggle, not children: a button inside a button is invalid HTML and
            browsers recover by dropping the inner one. The member count lives here too rather
            than inside the toggle, so all four controls share one `items-center` context and
            line up by construction instead of by matching margins. `pt-3` puts that row on
            the header's first line. */}
        <span className="flex shrink-0 items-center gap-0.5 pt-3 pe-2">
          {memberAnchors.length ? (
            <span className="pe-1 text-xs text-fd-muted-foreground tabular-nums">
              {memberAnchors.length}
            </span>
          ) : null}
          <CopyButton label="Copy code" icon={Copy} getText={() => code} />
          <CopyButton label="Copy link" icon={Link2} getText={() => anchorUrl(id)} />
          {action}
        </span>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={id}
        className={`border-t border-fd-border px-4 pt-3 pb-4 ${open ? '' : 'hidden'}`}
      >
        {children}
      </div>
    </div>
  );
}
