'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type Ref } from 'react';
import { ChevronRight, Text } from 'lucide-react';
import { NotebookBadges } from '@/components/notebook/badges';
import { SiteFooter } from '@/components/site/footer';
import { ToggleButtons } from '@/components/site/toggle-buttons';
import { cn } from '@/lib/cn';
import { readFrontmatter, splitDoc } from '@/lib/editor/doc';
import { renderMdx, RenderError, type Issue, type MathError } from '@/lib/editor/render';
import { blockAt, measureBlocks } from '@/lib/editor/scroll-map';
import { NotebookBody, useNotebook, type LocalNotebook } from './notebook-preview';

export type Device = 'desktop' | 'phone';

interface Heading {
  id: string;
  text: string;
  depth: number;
}

interface Output {
  content: ReactNode;
  issues: Issue[];
  mathErrors: MathError[];
  /** What was rendered. */
  source: string;
}

/** Renders `source` off the main beat, keeping the last good output through syntax errors. */
function useRendered(source: string) {
  const [output, setOutput] = useState<Output | null>(null);
  const [error, setError] = useState<Issue | null>(null);
  const { yaml, body, bodyLine } = useMemo(() => splitDoc(source), [source]);
  const offset = source.length - body.length;

  useEffect(() => {
    let current = true;
    const timer = setTimeout(() => {
      renderMdx(body, bodyLine - 1, { offset }).then(
        (result) => {
          if (!current) return;
          setOutput({ ...result, source });
          setError(null);
        },
        (failure: unknown) => {
          if (!current) return;
          setError(
            failure instanceof RenderError
              ? { message: failure.message, line: failure.line }
              : { message: failure instanceof Error ? failure.message : String(failure) },
          );
        },
      );
    }, 120);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [body, bodyLine, offset, source]);

  return { output, error, yaml, body, bodyLine };
}

type Layout = 'phone' | 'columns' | 'plain';

/** The page grid: sidebar from md, TOC from xl. */
const GRID = 'mx-auto grid w-full max-w-(--fd-layout-width) md:grid-cols-[16.75rem_minmax(0,1fr)] xl:grid-cols-[16.75rem_minmax(0,1fr)_16.75rem]';
const ARTICLE_X = 'px-4 md:px-6 xl:px-8';

/** Places `children` on the article's text column. */
function Lane({ layout, children }: { layout: Layout; children: ReactNode }) {
  if (layout === 'phone') {
    return (
      <div className="px-3">
        <div className="mx-auto max-w-[24.375rem] border-x border-transparent px-4">{children}</div>
      </div>
    );
  }
  const text = (
    <div className={ARTICLE_X}>
      <div className="max-w-[56.25rem]">{children}</div>
    </div>
  );
  if (layout === 'plain') return text;
  return (
    <div className={GRID}>
      <div className="max-md:hidden" />
      {text}
    </div>
  );
}

function Notice({ tone, layout, children }: { tone: 'error' | 'warn'; layout: Layout; children: ReactNode }) {
  const ink = tone === 'error' ? 'var(--color-fd-error)' : 'var(--brand-3-ink)';
  const fill = tone === 'error' ? 'var(--color-fd-error)' : 'var(--brand-3-fill)';
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      // Same gutter as the scroller below, so centered lanes match.
      className="overflow-hidden border-b border-fd-border py-3 text-sm [scrollbar-gutter:stable]"
      style={{ color: ink, background: `color-mix(in oklab, ${fill} 10%, var(--color-fd-background))` }}
    >
      <Lane layout={layout}>{children}</Lane>
    </div>
  );
}

function where(issue: Issue) {
  return issue.line ? `Line ${issue.line}: ` : '';
}

export function MdxPreview({
  source,
  device,
  page: chrome = false,
  cursorLine,
  localNotebook = null,
  onScroll,
  onMathErrors,
  ref,
}: {
  source: string;
  device: Device;
  /** Preview mode: the page's sidebar, breadcrumb and TOC around the content. */
  page?: boolean;
  cursorLine: number;
  /** Opened from disk; shown instead of the `notebook:` path's. */
  localNotebook?: LocalNotebook | null;
  onScroll: () => void;
  onMathErrors?: (errors: MathError[], source: string) => void;
  ref?: Ref<HTMLDivElement>;
}) {
  const { output, error, yaml, body, bodyLine } = useRendered(source);
  const reportMath = useRef(onMathErrors);
  reportMath.current = onMathErrors;
  useEffect(() => {
    if (output) reportMath.current?.(output.mathErrors, output.source);
  }, [output]);
  const { data, error: yamlError } = useMemo(() => readFrontmatter(yaml), [yaml]);
  const title = typeof data.title === 'string' ? data.title : '';
  const sidebarTitle = typeof data.sidebarTitle === 'string' ? data.sidebarTitle : '';
  const description = typeof data.description === 'string' ? data.description : '';
  const notebookFile = typeof data.notebook === 'string' && data.notebook.trim() ? data.notebook : null;
  const notebook = useNotebook(notebookFile, localNotebook);
  const loaded = notebook.status === 'ready' ? notebook.loaded : null;
  const notebookPage = Boolean(notebookFile || localNotebook);
  // The live page's App/Python toggle, kept here so the editor's URL stays its own.
  const duo = notebookPage && data.duoContent === true;
  const [client, setClient] = useState<'app' | 'python'>('app');
  const showApp = !duo || client === 'app';
  const showPython = !duo || client === 'python';
  // Typing in the body shows what is typed.
  const lastBody = useRef(body);
  useEffect(() => {
    if (body !== lastBody.current) setClient('app');
    lastBody.current = body;
  }, [body]);
  const scroller = useRef<HTMLDivElement | null>(null);
  const article = useRef<HTMLElement>(null);
  const [gutter, setGutter] = useState<{ top: number; left: number; height: number } | null>(null);
  const [toc, setToc] = useState<Heading[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const phone = device === 'phone';
  const columns = chrome && !phone;
  const layout: Layout = phone ? 'phone' : columns ? 'columns' : 'plain';

  useLayoutEffect(() => {
    const node = scroller.current;
    const frame = article.current;
    if (!node || !frame) return;
    const place = () => {
      const block = blockAt(measureBlocks(node), cursorLine);
      setGutter(block ? { top: block.top, left: frame.offsetLeft + 4, height: block.bottom - block.top } : null);
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [cursorLine, output, device, chrome, title, description, notebookPage, client]);

  useLayoutEffect(() => {
    const frame = article.current;
    if (!frame) return;
    setToc(
      // Notebook TOCs also take h1 and h4, as the page's does.
      Array.from(frame.querySelectorAll<HTMLElement>('.prose :is(h2, h3)[id], .nb-body :is(h1, h4)[id]'), (heading) => ({
        id: heading.id,
        text: heading.textContent?.trim() ?? '',
        depth: Number(heading.tagName.slice(1)),
      }))
        // Empty headings: no entry, and `#` is no selector.
        .filter((item) => item.id && item.text),
    );
  }, [output, loaded, client]);

  const jump = (id: string) => {
    const node = scroller.current;
    const target = node?.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
    if (!node || !target) return;
    node.scrollTop += target.getBoundingClientRect().top - node.getBoundingClientRect().top - 16;
  };

  // The last heading scrolled past the top, as the page's TOC marks it.
  const spy = useCallback(() => {
    const node = scroller.current;
    if (!node || !toc.length) return setActive(null);
    const top = node.getBoundingClientRect().top + 80;
    let current = toc[0].id;
    for (const item of toc) {
      const heading = node.querySelector(`#${CSS.escape(item.id)}`);
      if (!heading || heading.getBoundingClientRect().top > top) break;
      current = item.id;
    }
    if (node.scrollTop > 0 && node.scrollTop + node.clientHeight >= node.scrollHeight - 2) current = toc[toc.length - 1].id;
    setActive(current);
  }, [toc]);

  useEffect(spy, [spy, chrome]);

  const content = (
    <article
      ref={article}
      className={cn(
        'flex min-w-0 flex-col gap-4 *:max-w-[56.25rem]',
        phone ? 'px-4 pt-6 pb-6' : cn(ARTICLE_X, 'py-6 md:pt-8'),
      )}
    >
      {chrome ? (
        <div className="flex items-center gap-1.5 text-sm text-fd-muted-foreground">
          <span className="truncate">Section</span>
          <ChevronRight aria-hidden className="size-3.5 shrink-0" />
          <span className="truncate font-medium text-fd-primary">{sidebarTitle || title || 'Untitled'}</span>
        </div>
      ) : null}
      {/* A notebook page takes its title from the notebook. */}
      {yaml !== null && (!notebookPage || duo) ? (
        <header data-block data-start={1} data-end={Math.max(1, bodyLine - 1)} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <h1 className={cn('text-2xl font-semibold tracking-tight', !title && 'text-fd-muted-foreground')}>
              {title || 'Untitled'}
            </h1>
            {duo ? (
              <ToggleButtons
                label="Tutorial version"
                value={client}
                options={[
                  { value: 'app', text: 'App' },
                  { value: 'python', text: 'Python' },
                ]}
                onChange={setClient}
              />
            ) : null}
          </div>
          {description && !duo ? (
            <p className="-mt-4 mb-0 text-base leading-prose italic text-[color:var(--color-fd-description)]">
              {description}
            </p>
          ) : null}
        </header>
      ) : null}
      <div className="prose op-preview flex-1">
        {notebookFile && showPython ? <NotebookBadges file={notebookFile} /> : null}
        {!showApp ? null : body.trim() ? (
          output?.content
        ) : notebookPage && !duo ? null : (
          <p className="text-fd-muted-foreground">
            Nothing to preview yet. Write MDX in the editor, or insert a component from the toolbar.
          </p>
        )}
        {loaded && showPython ? <NotebookBody file={notebookFile ?? ''} loaded={loaded} duo={duo} /> : null}
        {notebook.status === 'loading' && showPython ? (
          <p className="text-fd-muted-foreground">Loading the notebook…</p>
        ) : null}
      </div>
    </article>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Pinned above the scroller, like the editor's toolbar. */}
      {error ? (
        <Notice tone="error" layout={layout}>
          {where(error)}
          {error.message}
        </Notice>
      ) : null}
      {yamlError ? <Notice tone="error" layout={layout}>Frontmatter: {yamlError}</Notice> : null}
      {output?.mathErrors.length ? (
        <Notice tone="error" layout={layout}>
          {output.mathErrors.map((issue, index) => (
            <span key={index} className="block">
              {where(issue)}
              {issue.message}
            </span>
          ))}
        </Notice>
      ) : null}
      {notebook.status === 'failed' && localNotebook ? (
        <Notice tone="error" layout={layout}>
          Couldn&apos;t read {notebook.file}. {notebook.reason}
        </Notice>
      ) : notebook.status === 'missing' || notebook.status === 'failed' ? (
        <Notice tone="warn" layout={layout}>
          {notebook.status === 'missing' ? 'No notebook at ' : "Couldn't load "}
          <code>content/notebooks/{notebook.file.replace(/^\.\//, '').replace(/^content\/notebooks\//, '')}</code>
        </Notice>
      ) : null}
      {output?.issues.length ? (
        <Notice tone="warn" layout={layout}>
          {output.issues.map((issue, index) => (
            <span key={index} className="block">
              {where(issue)}
              {issue.message} Skipped in the preview.
            </span>
          ))}
        </Notice>
      ) : null}
      <div
        ref={(node) => {
          scroller.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        onScroll={() => {
          onScroll();
          spy();
        }}
        className={cn(
          'relative min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]',
          phone && 'bg-[var(--op-panel-bg)] px-3 py-5',
        )}
      >
        {/* Editing only. */}
        {gutter && !chrome ? (
          <span
            aria-hidden
            className="pointer-events-none absolute z-10 w-[0.1875rem] rounded-full bg-fd-primary transition-[top,height] duration-150 motion-reduce:transition-none"
            style={gutter}
          />
        ) : null}
        {phone ? (
          <div className="mx-auto max-w-[24.375rem] overflow-hidden rounded-[1.125rem] border border-fd-border bg-fd-background">
            {content}
          </div>
        ) : columns ? (
          <div className={cn(GRID, 'min-h-full')}>
            <aside aria-label="Docs sidebar" className="max-md:hidden">
              <div className="sticky top-0 h-[calc(100dvh-var(--fd-nav-height)-3.25rem)] p-4">
                <div className="grid h-full place-items-center rounded-xl border border-dashed border-fd-border text-sm text-fd-muted-foreground">
                  Docs sidebar
                </div>
              </div>
            </aside>
            {content}
            <aside aria-label="On this page" className="max-xl:hidden">
              <div className="sticky top-0 flex flex-col pt-12 pe-4 pb-2">
                <h3 className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground">
                  <Text aria-hidden className="size-4" />
                  On this page
                </h3>
                {toc.length ? (
                  <div className="ms-px mt-3 flex flex-col border-s border-fd-border text-sm">
                    {toc.map((item, index) => (
                      <a
                        key={`${index}-${item.id}`}
                        href={`#${item.id}`}
                        data-active={item.id === active}
                        aria-current={item.id === active ? 'location' : undefined}
                        onClick={(event) => {
                          event.preventDefault();
                          jump(item.id);
                        }}
                        className={cn(
                          '-ms-px border-s border-transparent py-1.5 text-fd-muted-foreground transition-colors wrap-anywhere hover:text-fd-accent-foreground data-[active=true]:border-fd-primary data-[active=true]:text-fd-primary',
                          item.depth >= 4 ? 'ps-8' : item.depth === 3 ? 'ps-6' : 'ps-3',
                        )}
                      >
                        {item.text}
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-fd-muted-foreground">No headings yet.</p>
                )}
              </div>
            </aside>
          </div>
        ) : (
          content
        )}
        {columns ? <SiteFooter /> : null}
      </div>
    </div>
  );
}
