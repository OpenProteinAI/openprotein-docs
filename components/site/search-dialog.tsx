'use client';

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogOverlay,
  useSearch,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { fetchClient } from 'fumadocs-core/search/client/fetch';
import { staticClient } from 'fumadocs-core/search/client/orama-static';
import type { SortedResult } from 'fumadocs-core/search';
import { BASE_PATH } from '@/lib/base-path';
import { MODELS_URL } from '@/lib/models-tree';
import { SECTIONS } from '@/lib/sections';
import { PY_API_URL, REST_API_URL } from '@/lib/site';
import type { SharedProps } from 'fumadocs-ui/contexts/search';
import { ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { ReactNode } from 'react';

/** Result Markdown as text: no marks, bold, code ticks or escapes. */
const clean = (s: string) => s.replace(/<\/?mark>|\*\*|`/g, '').replace(/\\([!-/:-@[-`{-~])/g, '$1');

/** Matches the query's phrases and words, longest first. */
function queryPattern(search: string) {
  const { phrases, words } = parseQuery(search);
  const terms = [...phrases, ...words].sort((a, b) => b.length - a.length);
  if (terms.length === 0) return null;
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'));
  return new RegExp(`(${escaped.join('|')})`, 'gi');
}

/** Marks the matches; `clip` starts a long line just before the first. */
function highlight(content: string, pattern: RegExp | null, clip = false): ReactNode[] {
  let text = clean(content);
  if (!pattern) return [text];
  const first = text.search(pattern);
  const cut = clip && first > 30 ? text.lastIndexOf(' ', first - 15) : -1;
  if (cut > 0) text = `…${text.slice(cut + 1)}`;
  return text.split(pattern).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-fd-primary/15 text-fd-primary">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

const FIRST = [
  { text: 'Models', url: MODELS_URL },
  { text: 'REST API', url: REST_API_URL },
  { text: 'Python API', url: PY_API_URL },
  { text: 'How-to', url: '/how-tos' },
  { text: 'Concepts', url: '/concepts' },
  { text: 'Tutorials', url: '/tutorials' },
];

// Display order; first match wins.
const GROUPS = [
  ...FIRST,
  ...SECTIONS.filter((s) => !FIRST.some((f) => f.url === s.url)),
  { text: 'Other', url: '' },
];

interface PageNode {
  page: SortedResult;
  hits: SortedResult[];
  /** Breadcrumbs below the group's own. */
  trail: string[];
}

interface Group {
  id: string;
  text: string;
  pages: PageNode[];
}

const ROW = 'rounded-md text-start data-[active=true]:bg-fd-accent';
const BRANCH = 'relative before:absolute before:inset-y-0 before:start-(--guide) before:w-px before:bg-fd-border';

function within(url: string, section: string) {
  const path = url.split('#')[0];
  return section === '' || path === section || path.startsWith(`${section}/`);
}

/** `"a b"` is one phrase; the rest are words. */
function parseQuery(search: string) {
  const phrases: string[] = [];
  const words: string[] = [];
  for (const [, phrase, word] of search.toLowerCase().matchAll(/"([^"]*)"?|([^\s"]+)/g)) {
    if (word) words.push(word);
    else if (phrase.trim()) phrases.push(phrase.trim().replace(/\s+/g, ' '));
  }
  return { phrases, words };
}

const plain = (s: string) => clean(s).replace(/\s+/g, ' ').toLowerCase();

/** Rows with every phrase and word; failing that, every phrase. */
function narrow(items: SortedResult[], search: string) {
  const { phrases, words } = parseQuery(search);
  const blocks: SortedResult[][] = [];
  for (const r of items) {
    if (r.type === 'page' || blocks.length === 0) blocks.push([r]);
    else blocks[blocks.length - 1].push(r);
  }
  const keep = (needed: string[]) => {
    const has = (r: SortedResult) => needed.every((n) => plain(r.content).includes(n));
    return blocks.flatMap(([page, ...hits]) => {
      const matched = hits.filter(has);
      return has(page) || matched.length > 0 ? [page, ...matched] : [];
    });
  };
  const strict = keep([...phrases, ...words]);
  if (strict.length > 0) return strict;
  return phrases.length > 0 ? keep(phrases) : items;
}

function groupResults(items: SortedResult[], pathname: string): Group[] {
  const groups = GROUPS.map((g) => ({ id: `group:${g.url}`, text: g.text, pages: [] as PageNode[] }));
  let current: PageNode | undefined;
  for (const item of items) {
    // Hits follow their page.
    if (item.type !== 'page' && current) {
      current.hits.push(item);
      continue;
    }
    const i = GROUPS.findIndex((g) => within(item.url, g.url));
    const depth = GROUPS[i].url.split('/').filter(Boolean).length;
    current = { page: item, hits: [], trail: item.breadcrumbs?.slice(depth) ?? [] };
    groups[i].pages.push(current);
  }
  // The reader's own section first.
  const here = GROUPS.findIndex((g) => g.url !== '' && within(pathname, g.url));
  if (here > 0) groups.unshift(...groups.splice(here, 1));
  return groups.filter((g) => g.pages.length > 0);
}

function SearchResults({ items, search }: { items: SortedResult[] | null; search: string }) {
  const { onSelect, onOpenChange } = useSearch();
  const pathname = usePathname();

  // A same-page jump through the router fires no hashchange, so nothing would open.
  const go = (item: SortedResult) => {
    const [path, hash] = item.url.split('#');
    if (path !== pathname || !hash) return onSelect(item);
    onOpenChange(false);
    if (window.location.hash !== `#${hash}`) window.location.hash = hash;
    else {
      window.dispatchEvent(new HashChangeEvent('hashchange'));
      document.getElementById(decodeURIComponent(hash))?.scrollIntoView();
    }
  };
  const groups = useMemo(() => (items ? groupResults(items, pathname) : []), [items, pathname]);
  const pattern = useMemo(() => queryPattern(search), [search]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [active, setActive] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const scrollToActive = useRef(false);

  // Visible rows in keyboard order.
  const rows = useMemo(
    () =>
      groups.flatMap((g) => [
        { id: g.id, group: g },
        ...(collapsed.has(g.id)
          ? []
          : g.pages.flatMap((p) => [p.page, ...p.hits]).map((item) => ({ id: item.id, item }))),
      ]),
    [groups, collapsed],
  );

  const [shown, setShown] = useState(items);
  if (items !== shown) {
    setShown(items);
    setActive((rows.find((r) => 'item' in r) ?? rows[0])?.id ?? null);
  }

  const toggle = (id: string) => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsed(next);
    setActive(id);
  };

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.isComposing || rows.length === 0) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const i = rows.findIndex((r) => r.id === active);
      const step = e.key === 'ArrowDown' ? 1 : -1;
      scrollToActive.current = true;
      setActive(rows[i === -1 ? 0 : (i + step + rows.length) % rows.length].id);
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const row = rows.find((r) => r.id === active);
      if (!row) return;
      if ('group' in row) toggle(row.id);
      else go(row.item);
      e.preventDefault();
    }
  });

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!scrollToActive.current) return;
    scrollToActive.current = false;
    listRef.current?.querySelector('[data-active=true]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const row = (id: string) => ({
    'data-active': id === active,
    onPointerMove: () => id !== active && setActive(id),
  });

  if (!items) return <div data-empty />;

  return (
    <div ref={listRef} className="max-h-[min(32rem,70vh)] overflow-y-auto overscroll-contain px-1.5 pb-1.5">
      {groups.length === 0 && (
        <div className="px-3.5 py-6 text-center text-sm text-fd-muted-foreground">
          No matches. Try “assay”, “embeddings”, or “fold”.
        </div>
      )}
      {groups.map((g) => {
        const open = !collapsed.has(g.id);
        return (
          <div key={g.id} className="first:pt-0.5">
            <div className="sticky top-0 z-10 bg-fd-popover pt-1">
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(g.id)}
                {...row(g.id)}
                className={`${ROW} flex w-full scroll-mt-1 items-center gap-1.5 px-2 py-1 text-2xs font-medium tracking-caps text-fd-muted-foreground uppercase`}
              >
                {g.text}
                <span className="tracking-normal text-fd-muted-foreground/70 tabular-nums">
                  {g.pages.length}
                </span>
                <ChevronRight
                  className={`ms-auto size-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
                />
              </button>
            </div>
            {open && (
              <div className={`${BRANCH} [--guide:0.75rem]`}>
                {g.pages.map(({ page, hits, trail }) => (
                  <div key={page.id}>
                    <button
                      type="button"
                      onClick={() => go(page)}
                      {...row(page.id)}
                      className={`${ROW} flex w-full scroll-mt-7 items-baseline gap-2 py-1 ps-6 pe-2 text-sm`}
                    >
                      <span className="min-w-0 truncate font-medium text-fd-foreground">
                        {highlight(page.content, pattern)}
                      </span>
                      {trail.length > 0 && (
                        <span className="ms-auto max-w-[45%] shrink-0 truncate text-xs text-fd-muted-foreground">
                          {trail.join(' / ')}
                        </span>
                      )}
                    </button>
                    {hits.length > 0 && (
                      <div className={`${BRANCH} [--guide:1.875rem]`}>
                        {hits.map((hit) => (
                          <button
                            key={hit.id}
                            type="button"
                            onClick={() => go(hit)}
                            {...row(hit.id)}
                            className={`${ROW} block w-full scroll-mt-7 truncate py-1 ps-[2.625rem] pe-2 text-sm ${hit.type === 'heading' ? 'text-fd-foreground' : 'text-fd-muted-foreground'}`}
                          >
                            {highlight(hit.content, pattern, true)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function OpSearchDialog(props: SharedProps) {
  const client = useMemo(() => {
    const engine =
      process.env.NEXT_PUBLIC_BUILD_TARGET === 'static'
        ? // As on the server: every match, not the first 60.
          staticClient({ from: `${BASE_PATH}/api/search`, search: { limit: undefined } })
        : fetchClient({});
    // Quotes would break highlighting; narrow() applies the phrases.
    return {
      deps: engine.deps,
      search: async (q: string) => {
        const terms = q.replaceAll('"', ' ').trim();
        return terms ? engine.search(terms) : [];
      },
    };
  }, []);
  const { search, setSearch, query } = useDocsSearch({ client });
  const items = useMemo(
    () =>
      query.data && query.data !== 'empty' && search.replaceAll('"', '').trim()
        ? narrow(query.data, search)
        : null,
    [query.data, search],
  );

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay className="bg-fd-background/70 backdrop-blur-none" />
      <SearchDialogContent className="top-[12vh] max-w-[38.75rem] translate-y-0 rounded-[0.75em]">
        <SearchDialogHeader className="relative">
          <SearchDialogIcon />
          {/* SearchDialogInput overrides any placeholder. */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={'Search, or "an exact phrase"'}
            className="w-0 flex-1 bg-transparent text-lg placeholder:text-fd-muted-foreground focus-visible:outline-none"
          />
          <SearchDialogClose />
          {/* Delayed, so a search that settles within 100ms never flashes it. */}
          {query.isLoading && (
            <Progress
              aria-label="Searching"
              className="absolute inset-x-0 -bottom-px animate-[op-progress-in_150ms_ease-out_100ms_both]"
            />
          )}
        </SearchDialogHeader>
        <SearchResults items={items} search={search} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
