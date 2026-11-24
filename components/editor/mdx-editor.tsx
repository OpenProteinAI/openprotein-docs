'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Columns2, Eye, Link2, Monitor, PenLine, Smartphone } from 'lucide-react';
import { Button } from '@/components/site/button';
import { cn } from '@/lib/cn';
import { SHELL_COLUMN } from '@/lib/columns';
import { formatMdx } from '@/lib/editor/format';
import { EMPTY_DOC } from '@/lib/editor/frontmatter';
import { addIconImports } from '@/lib/editor/imports';
import { pageSourceUrl, readSharedPage } from '@/lib/editor/page';
import { lineToY, measureBlocks, yToLine } from '@/lib/editor/scroll-map';
import { readSharedDoc, readSharedView, shareUrl, type ViewMode } from '@/lib/editor/share';
import { EditorToolbar } from './editor-toolbar';
import { MathToolbar } from './math-toolbar';
import { MdxPreview, type Device } from './mdx-preview';
import type { LocalNotebook } from './notebook-preview';
import { PageSettings } from './page-settings';
import { PREVIEW_COMPONENTS } from './preview-components';
import { Segmented } from './segmented';
import { readSplit, Splitter } from './splitter';
import { SourceEditor, type SourceEditorHandle } from './source-editor';

type View = ViewMode;

const WIDE = '(min-width: 67.5rem)';

/** Docs components: never imported from lucide-react. */
const RESERVED = new Set(Object.keys(PREVIEW_COMPONENTS));

function useWide(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(WIDE);
      query.addEventListener('change', notify);
      return () => query.removeEventListener('change', notify);
    },
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
}

const MATH_KEY = 'op-editor-math';

function readMath(): boolean {
  try {
    return window.localStorage.getItem(MATH_KEY) === 'on';
  } catch {
    return false;
  }
}

function initialDoc(): { source: string; unreadable: boolean; page: string | null } {
  const shared = readSharedDoc();
  const hasData = new URLSearchParams(window.location.search).has('data');
  return {
    source: shared ?? EMPTY_DOC,
    unreadable: hasData && shared === null,
    page: hasData ? null : readSharedPage(),
  };
}

export function MdxEditor({ onReady }: { onReady?: () => void }) {
  const [initial] = useState(initialDoc);
  const [source, setSource] = useState(initial.source);
  const [loading, setLoading] = useState<'pending' | 'failed' | null>(initial.page ? 'pending' : null);
  const [mode, setMode] = useState<View>(() => readSharedView() ?? 'split');
  const [device, setDevice] = useState<Device>('desktop');
  const [split, setSplit] = useState(readSplit);
  const panes = useRef<HTMLDivElement>(null);
  const [cursorLine, setCursorLine] = useState(1);
  const [copied, setCopied] = useState(false);
  const [localNotebook, setLocalNotebook] = useState<LocalNotebook | null>(null);
  const [math, setMath] = useState(readMath);
  const [inMath, setInMath] = useState(false);
  const wide = useWide();
  const view: View = !wide && mode === 'split' ? 'write' : mode;
  const editor = useRef<SourceEditorHandle>(null);
  const preview = useRef<HTMLDivElement>(null);
  // Which pane a sync just moved, so its echo is ignored.
  const moved = useRef<{ pane: 'editor' | 'preview' | null; until: number }>({ pane: null, until: 0 });

  useEffect(() => {
    const page = initial.page;
    if (!page) return;
    let live = true;
    fetch(pageSourceUrl(page))
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { mdx?: unknown } | null) => {
        if (!live) return;
        const mdx = data?.mdx;
        if (typeof mdx !== 'string') return setLoading('failed');
        setSource(mdx);
        setLoading(null);
      })
      .catch(() => live && setLoading('failed'));
    return () => {
      live = false;
    };
  }, [initial.page]);

  const ready = loading !== 'pending';
  useEffect(() => {
    if (ready) onReady?.();
  }, [ready, onReady]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      window.history.replaceState(null, '', shareUrl(source === EMPTY_DOC ? null : source, mode));
    }, 400);
    return () => clearTimeout(timer);
  }, [source, mode, ready]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = addIconImports(source, RESERVED);
      if (next !== source) setSource(next);
    }, 700);
    return () => clearTimeout(timer);
  }, [source]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const follow = (from: 'editor' | 'preview') => {
    if (view !== 'split') return;
    const now = performance.now();
    if (moved.current.pane === from && now < moved.current.until) return;
    const pane = preview.current;
    const handle = editor.current;
    const scroller = handle?.scroller();
    if (!pane || !handle || !scroller) return;
    const blocks = measureBlocks(pane);
    // Match the panes at one screen y: the lower of their top edges.
    const paneTop = pane.getBoundingClientRect().top;
    const editorTop = scroller.getBoundingClientRect().top;
    const inPane = Math.max(0, editorTop - paneTop);
    const inEditor = Math.max(0, paneTop - editorTop);
    if (from === 'editor') {
      moved.current = { pane: 'preview', until: now + 150 };
      if (scroller.scrollTop <= 1) pane.scrollTop = 0;
      else pane.scrollTop = handle.isAtEnd() ? pane.scrollHeight : lineToY(blocks, handle.lineAt(inEditor)) - inPane;
    } else {
      moved.current = { pane: 'editor', until: now + 150 };
      const atEnd = pane.scrollTop + pane.clientHeight >= pane.scrollHeight - 2;
      if (pane.scrollTop <= 1) scroller.scrollTop = 0;
      else if (atEnd) scroller.scrollTop = scroller.scrollHeight;
      else handle.scrollToLine(yToLine(blocks, pane.scrollTop + inPane), inEditor);
    }
  };

  const toggleMath = (on: boolean) => {
    setMath(on);
    try {
      window.localStorage.setItem(MATH_KEY, on ? 'on' : 'off');
    } catch {
      // Private windows.
    }
  };

  const runFormat = () => {
    try {
      const next = formatMdx(source);
      if (next !== source) setSource(next);
    } catch {
      // The notice bar shows the error.
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl(source === EMPTY_DOC ? null : source, mode));
      setCopied(true);
    } catch {
      window.prompt('Copy this URL', shareUrl(source === EMPTY_DOC ? null : source, mode));
    }
  };

  if (!ready) return null;

  return (
    <div data-op-editor className="flex h-[calc(100dvh-var(--fd-nav-height))] flex-col">
      <div className="flex-none border-b border-fd-border">
        <div className={cn(SHELL_COLUMN, 'flex flex-wrap items-center gap-x-3 gap-y-2 py-2')}>
          <Segmented
            label="View"
            value={view}
            onChange={setMode}
            options={[
              ...(wide ? [{ value: 'split' as const, label: 'Split', Icon: Columns2 }] : []),
              { value: 'write', label: 'Write', Icon: PenLine },
              { value: 'preview', label: 'Preview', Icon: Eye },
            ]}
          />
          <PageSettings
            source={source}
            onChange={setSource}
            localNotebook={localNotebook}
            onLocalNotebook={setLocalNotebook}
          />
          {initial.unreadable ? (
            <span role="status" className="text-sm" style={{ color: 'var(--color-fd-error)' }}>
              This link&apos;s content couldn&apos;t be read.
            </span>
          ) : null}
          {loading === 'failed' ? (
            <span role="status" className="text-sm" style={{ color: 'var(--color-fd-error)' }}>
              Couldn&apos;t load {initial.page}.
            </span>
          ) : null}
          <div className="flex-1" />
          <Segmented
            label="Preview width"
            value={device}
            onChange={setDevice}
            options={[
              { value: 'desktop', label: 'Desktop', Icon: Monitor },
              { value: 'phone', label: 'Mobile', Icon: Smartphone },
            ]}
          />
          <Button variant="primary" size="compact" onClick={copy} className="min-h-[2.125rem]">
            <Link2 className="size-4" />
            {copied ? 'Copied' : 'Copy URL'}
          </Button>
        </div>
      </div>

      <div ref={panes} className="flex min-h-0 flex-1">
        <section
          id="op-editor-source"
          aria-label="Editor"
          className={cn(
            'flex min-w-0 flex-1 basis-0 flex-col',
            view === 'preview' && 'hidden',
            // Write: the header's content column, not the full width.
            view === 'write' && 'mx-auto w-full max-w-[calc(var(--fd-layout-width)-2rem)] border-x border-fd-border',
          )}
          style={view === 'split' ? { flex: `0 0 ${split * 100}%` } : undefined}
        >
          <EditorToolbar editor={editor} onFormat={runFormat} math={math} onMath={toggleMath} />
          {math ? <MathToolbar editor={editor} inMath={inMath} /> : null}
          {/* The page scrolls only below this. */}
          <div className="min-h-30 flex-1">
            <SourceEditor
              ref={editor}
              value={source}
              onChange={setSource}
              onCursor={setCursorLine}
              onScroll={() => follow('editor')}
              onFormat={runFormat}
              onMath={setInMath}
            />
          </div>
        </section>
        {view === 'split' ? (
          <Splitter container={panes} value={split} onChange={setSplit} controls="op-editor-source" />
        ) : null}
        <section aria-label="Preview" className={cn('min-w-0 flex-1 basis-0', view === 'write' && 'hidden')}>
          <MdxPreview
            ref={preview}
            source={source}
            device={device}
            page={view === 'preview'}
            cursorLine={cursorLine}
            localNotebook={localNotebook}
            onScroll={() => follow('preview')}
            onMathErrors={(errors, rendered) => editor.current?.markMathErrors(rendered, errors)}
          />
        </section>
      </div>
    </div>
  );
}
