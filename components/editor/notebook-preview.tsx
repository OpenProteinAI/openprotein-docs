'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CodeCellFrame } from '@/components/notebook/code-cell-frame';
import { EmbedFrame } from '@/components/notebook/embed-frame';
import { embedLink } from '@/lib/notebook-embed';
import { Output } from '@/components/notebook/output';
import { notebookJsonUrl, notebookPath, type PreviewCell, type PreviewNotebook } from '@/lib/editor/notebook';
import { renderLocalProse } from '@/lib/editor/notebook-markdown';
import { renderMdx } from '@/lib/editor/render';
import { parseNotebook, type RawNotebook } from '@/lib/notebook-parse';

/** A notebook the writer opened from disk. */
export interface LocalNotebook {
  name: string;
  text: string;
}

interface Loaded {
  notebook: PreviewNotebook;
  /** Highlighted source per cell; null for markdown. */
  code: ReactNode[];
}

class Missing extends Error {}

const loads = new Map<string, Promise<Loaded>>();

/** A fence longer than any backtick run in the source. */
function fenced(source: string, language: string): string {
  const longest = Math.max(2, ...Array.from(source.matchAll(/`+/g), (match) => match[0].length));
  const fence = '`'.repeat(longest + 1);
  return `${fence}${language.replace(/[^\w+-]/g, '')}\n${source}\n${fence}\n`;
}

function highlightCells(notebook: PreviewNotebook): Promise<ReactNode[]> {
  return Promise.all(
    notebook.cells.map((cell) =>
      cell.kind === 'code' && cell.source
        ? renderMdx(fenced(cell.source, notebook.language), 0, { blocks: false }).then(
            (result) => result.content,
            () => null,
          )
        : null,
    ),
  );
}

function load(rel: string): Promise<Loaded> {
  let pending = loads.get(rel);
  if (!pending) {
    pending = fetch(notebookJsonUrl(rel)).then(async (response) => {
      if (response.status === 404) throw new Missing();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const notebook = (await response.json()) as PreviewNotebook;
      return { notebook, code: await highlightCells(notebook) };
    });
    // Retry what failed for a reason other than absence.
    pending.catch((error: unknown) => {
      if (!(error instanceof Missing)) loads.delete(rel);
    });
    loads.set(rel, pending);
  }
  return pending;
}

/** Parsed and rendered in the browser; its viewers get blob URLs the caller revokes. */
async function loadLocal(local: LocalNotebook): Promise<{ loaded: Loaded; urls: string[] }> {
  let raw: RawNotebook | null;
  try {
    raw = JSON.parse(local.text) as RawNotebook | null;
  } catch {
    throw new Error('It is not valid JSON.');
  }
  if (!Array.isArray(raw?.cells)) throw new Error('It has no notebook cells.');
  const parsed = parseNotebook(raw);
  const prose = await Promise.all(parsed.cells.map((cell) => (cell.kind === 'markdown' ? renderLocalProse(cell.source) : null)));
  const urls: string[] = [];
  let embeds = 0;
  const cells = parsed.cells.map(
    (cell, index): PreviewCell =>
      cell.kind === 'markdown'
        ? { kind: 'markdown', html: prose[index] ?? '' }
        : {
            kind: 'code',
            source: cell.source,
            executionCount: cell.executionCount,
            outputs: cell.outputs.map((output) => {
              if (output.kind !== 'embed') return output;
              const src = URL.createObjectURL(new Blob([output.document], { type: 'text/html' }));
              urls.push(src);
              return { kind: 'embed', label: output.label, bytes: output.document.length, index: embeds++, src };
            }),
          },
  );
  const notebook = { language: parsed.language, cells };
  return { loaded: { notebook, code: await highlightCells(notebook) }, urls };
}

export type NotebookState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'missing'; file: string }
  | { status: 'failed'; file: string; reason?: string }
  | { status: 'ready'; file: string; loaded: Loaded };

/** The notebook a page's `notebook:` names, fetched once per path. */
function useRepoNotebook(file: string | null): NotebookState {
  const rel = file ? notebookPath(file) : null;
  const [result, setResult] = useState<{ rel: string; loaded: Loaded | 'missing' | 'failed' } | null>(null);

  useEffect(() => {
    if (!rel) return;
    let current = true;
    // Waits out typing in the path; a loaded notebook shows at once.
    const timer = setTimeout(
      () => {
        load(rel).then(
          (loaded) => current && setResult({ rel, loaded }),
          (error: unknown) => current && setResult({ rel, loaded: error instanceof Missing ? 'missing' : 'failed' }),
        );
      },
      loads.has(rel) ? 0 : 300,
    );
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [rel]);

  if (!file) return { status: 'none' };
  if (!rel) return { status: 'missing', file };
  if (result?.rel !== rel) return { status: 'loading' };
  if (result.loaded === 'missing') return { status: 'missing', file };
  if (result.loaded === 'failed') return { status: 'failed', file };
  return { status: 'ready', file, loaded: result.loaded };
}

function useLocalNotebook(local: LocalNotebook | null): NotebookState {
  const [result, setResult] = useState<{ local: LocalNotebook; loaded?: Loaded; reason?: string } | null>(null);

  useEffect(() => {
    if (!local) return;
    let current = true;
    let urls: string[] = [];
    loadLocal(local).then(
      (value) => {
        if (current) {
          urls = value.urls;
          setResult({ local, loaded: value.loaded });
        } else {
          value.urls.forEach((url) => URL.revokeObjectURL(url));
        }
      },
      (error: unknown) => {
        if (current) setResult({ local, reason: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      current = false;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [local]);

  if (!local) return { status: 'none' };
  if (result?.local !== local) return { status: 'loading' };
  if (!result.loaded) return { status: 'failed', file: local.name, reason: result.reason };
  return { status: 'ready', file: local.name, loaded: result.loaded };
}

/** A local file, when one is open, wins over the page's `notebook:`. */
export function useNotebook(file: string | null, local: LocalNotebook | null): NotebookState {
  const repo = useRepoNotebook(local ? null : file);
  const disk = useLocalNotebook(local);
  return local ? disk : repo;
}

/** NotebookView's `untitled` and `headingShift={1}`, on rendered HTML. */
function underTitle(html: string, first: boolean): string {
  return (first ? html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/, '') : html).replace(
    /<(\/?)h([1-5])\b/g,
    (_, slash: string, level: string) => `<${slash}h${Number(level) + 1}`,
  );
}

/** The cells as the page's NotebookView renders them; `duo` as a duoContent page's Python version. */
export function NotebookBody({ file, loaded, duo = false }: { file: string; loaded: Loaded; duo?: boolean }) {
  const { notebook, code } = loaded;
  const first = notebook.cells.findIndex((cell) => cell.kind === 'markdown');
  return (
    <div className="nb-body not-prose">
      {notebook.cells.map((cell, index) =>
        cell.kind === 'markdown' ? (
          cell.html ? (
            <div
              key={index}
              className="prose-no-margin my-5"
              dangerouslySetInnerHTML={{ __html: duo ? underTitle(cell.html, index === first) : cell.html }}
            />
          ) : null
        ) : (
          <CodeCellFrame
            key={index}
            executionCount={cell.executionCount}
            // The page's ServerCodeBlock has no block margin; MDX code does.
            code={code[index] ? <div className="[&>figure]:my-0">{code[index]}</div> : null}
            outputs={cell.outputs.map((output, n) =>
              output.kind === 'embed' ? (
                <EmbedFrame
                  key={n}
                  label={output.label}
                  bytes={output.bytes}
                  {...(output.src
                    ? { src: output.src, download: { href: output.src, name: `viewer-${output.index + 1}.html` } }
                    : embedLink(file, output.index))}
                />
              ) : (
                <Output key={n} output={output} file={file} embedIndex={-1} />
              ),
            )}
          />
        ),
      )}
    </div>
  );
}
