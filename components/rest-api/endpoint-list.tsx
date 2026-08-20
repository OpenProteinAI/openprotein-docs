'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Copy, Link2 } from 'lucide-react';
import { CopyButton, anchorUrl } from '@/components/copy-button';
import { MethodLabel } from './method-label';
import { useHashTarget } from '@/components/use-hash-target';
import {
  operationKey,
  type EndpointOperation,
  type EndpointSection,
  type EndpointTree,
} from '@/lib/openapi-endpoints';

/** Section heading size by tree depth; embeddings nests group / model / operation. */
const SECTION_SIZE = ['text-xl', 'text-lg', 'text-base'];

interface ListProps {
  tree: EndpointTree | EndpointSection;
  depth: number;
  /** Operation bodies fumadocs rendered, keyed by `operationKey`. */
  bodies: Map<string, ReactNode>;
  markdown: (md: string) => ReactNode;
}

function anchorsOf(tree: EndpointTree | EndpointSection): string[] {
  return [
    ...tree.operations.map((operation) => operation.anchor),
    ...tree.sections.flatMap((section) => [section.anchor, ...anchorsOf(section)]),
  ];
}

function countOf(tree: EndpointTree | EndpointSection): number {
  return tree.operations.length + tree.sections.reduce((total, s) => total + countOf(s), 0);
}

/**
 * The whole REST reference page: the document's tags, each a section of collapsed
 * endpoints, replacing fumadocs' flat stack of expanded operations.
 *
 * `data-rest-api` scopes one rule in app/global.css.
 */
export function EndpointRoot(props: ListProps) {
  return (
    <div data-rest-api className="@container flex flex-col text-sm">
      <EndpointList {...props} />
    </div>
  );
}

function EndpointList({ tree, depth, bodies, markdown }: ListProps) {
  return (
    <>
      {tree.operations.length > 0 ? (
        <div className="flex flex-col gap-2">
          {tree.operations.map((operation) => (
            <EndpointCard
              key={operation.anchor}
              operation={operation}
              depth={depth}
              body={bodies.get(operationKey(operation.path, operation.method))}
            />
          ))}
        </div>
      ) : null}
      {tree.sections.map((section) => (
        <Section
          key={section.key}
          section={section}
          depth={depth}
          bodies={bodies}
          markdown={markdown}
        />
      ))}
    </>
  );
}

/**
 * One tag as a collapsible section, open by default: the endpoint list is the page's
 * navigation, and collapsing it too would leave a reader who followed a sidebar link
 * looking at a stack of tag names.
 *
 * Deliberately unlike an endpoint card - a full-width rule with a proportional
 * semibold name, against a bordered card with a monospace path - so the two levels
 * never read as one flat list.
 */
function Section({
  section,
  depth,
  bodies,
  markdown,
}: Omit<ListProps, 'tree'> & { section: EndpointSection }) {
  const [open, setOpen] = useState(true);
  useHashTarget([section.anchor, ...anchorsOf(section)], () => setOpen(true));

  const Tag = `h${Math.min(depth, 4)}` as 'h2';
  const panelId = `${section.anchor}-endpoints`;

  return (
    <section className="mt-10 first:mt-0">
      <Tag
        id={section.anchor}
        className={`not-prose m-0 scroll-mt-24 border-b border-fd-border font-normal ${SECTION_SIZE[depth - 2] ?? 'text-base'}`}
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
          <span className="min-w-0 flex-1 font-semibold text-fd-foreground">{section.title}</span>
          <span className="shrink-0 self-center text-xs text-fd-muted-foreground tabular-nums">
            {countOf(section)}
          </span>
        </button>
      </Tag>

      {/*
       * Mounted whether open or not, hidden with CSS. Fumadocs' TOC registers its
       * anchors once, by `document.getElementById`, and nothing re-registers them - an
       * endpoint row inside an unmounted section would never highlight, and a deep link
       * would have nothing to scroll to. The rows are cheap; the playgrounds and schema
       * trees inside them are what stay lazy.
       */}
      <div
        id={panelId}
        role="group"
        aria-labelledby={section.anchor}
        className={open ? 'pt-4' : 'hidden'}
      >
        {section.description ? (
          <div className="mb-5 text-sm text-fd-muted-foreground">
            {markdown(section.description)}
          </div>
        ) : null}
        <EndpointList tree={section} depth={depth + 1} bodies={bodies} markdown={markdown} />
      </div>
    </section>
  );
}

function EndpointCard({
  operation,
  depth,
  body,
}: {
  operation: EndpointOperation;
  depth: number;
  body: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  /**
   * Once opened, stay mounted - hidden, not unmounted. Rendering every endpoint up
   * front would mount every playground and every expanded schema tree, which is most
   * of what made the old Swagger page slow; unmounting on collapse would throw away
   * whatever the reader had typed into the playground.
   */
  const [everOpened, setEverOpened] = useState(false);

  useHashTarget([operation.anchor], () => {
    setOpen(true);
    setEverOpened(true);
    // The browser's own fragment scroll ran while this row was still inside a collapsed
    // section, with no box to scroll to. By the next frame there is one.
    requestAnimationFrame(() => heading.current?.scrollIntoView({ block: 'start' }));
  });

  const Tag = `h${Math.min(depth, 5)}` as 'h3';
  const panelId = `${operation.anchor}-content`;

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-fd-card transition-colors ${
        open ? 'border-fd-primary' : 'border-fd-border'
      }`}
    >
      {/*
       * The anchor lives on this row, not on the card: fumadocs' TOC tracks the active
       * entry with an IntersectionObserver, and an expanded card is taller than the
       * viewport so it would never qualify.
       *
       * The copy buttons are siblings of the toggle - a button inside a button is
       * invalid HTML and browsers drop the inner one - which is also why the flex row is
       * the heading itself, since a heading may only contain phrasing content.
       */}
      <Tag
        ref={heading}
        id={operation.anchor}
        className="not-prose m-0 flex scroll-mt-24 items-center pe-2 text-base font-normal transition-colors hover:bg-fd-accent/50 has-focus-visible:bg-fd-accent/50"
      >
        <button
          type="button"
          onClick={() => {
            setOpen((value) => !value);
            setEverOpened(true);
          }}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-start focus-visible:ring-2 focus-visible:ring-fd-ring focus-visible:ring-inset focus-visible:outline-none"
        >
          <ChevronRight
            aria-hidden
            className={`size-4 shrink-0 text-fd-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`}
          />
          <MethodLabel method={operation.method} className="shrink-0 text-xs" />
          <span
            className={`shrink-0 font-mono text-sm text-fd-foreground ${operation.deprecated ? 'line-through' : ''}`}
          >
            {operation.path}
          </span>
          {operation.title !== operation.path ? (
            <span className="hidden min-w-0 flex-1 truncate text-sm text-fd-muted-foreground @md:block">
              {operation.title}
            </span>
          ) : null}
          {operation.deprecated ? (
            <span className="ms-auto shrink-0 font-mono text-xs font-medium text-yellow-600 dark:text-yellow-400">
              Deprecated
            </span>
          ) : null}
        </button>

        <CopyButton label="Copy path" icon={Copy} getText={() => operation.path} />
        <CopyButton label="Copy link" icon={Link2} getText={() => anchorUrl(operation.anchor)} />
      </Tag>

      {everOpened ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={operation.anchor}
          className={`border-t border-fd-border px-4 pt-2 pb-6 ${open ? '' : 'hidden'}`}
        >
          {body}
        </div>
      ) : null}
    </div>
  );
}
