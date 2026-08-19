import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import Slugger from 'github-slugger';
import type { TOCItemType } from 'fumadocs-core/toc';

const NOTEBOOK_DIR = path.join(process.cwd(), 'content', 'notebooks');

/** The archived viewers load molstar@latest; pin to what /Users/phap/Repo/ui ships. */
const MOLSTAR_VERSION = '5.11.0';

const EMBED_LABEL = 'Mol* structure viewer';

/** The empty div a Mol* JS output writes its iframe into. Real DataFrame HTML must survive. */
const MOLSTAR_STUB = /^\s*<div\s+id="molstar_[0-9a-fA-F-]+"\s*>\s*<\/div>\s*$/;

const JS_REPR = '<IPython.core.display.Javascript object>';

/** Stream text still carries colour codes even though nothing in the corpus errored. */
const ANSI = /\u001B\[[0-9;]*m/g;

/** Richest first, so a table or a viewer never falls back to text/plain. */
const MIME_ORDER = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/javascript',
  'text/html',
  'image/svg+xml',
  'text/plain',
] as const;

export type NotebookOutput =
  | { kind: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'html'; html: string }
  | { kind: 'image'; mime: string; base64: string }
  | { kind: 'embed'; label: string; document: string }
  | { kind: 'javascript'; code: string };

export type NotebookCell =
  | { kind: 'markdown'; id: string; source: string }
  | {
      kind: 'code';
      id: string;
      source: string;
      executionCount: number | null;
      outputs: NotebookOutput[];
    };

export interface Notebook {
  cells: NotebookCell[];
  toc: TOCItemType[];
  kernel?: string;
  language: string;
}

type Multiline = string | string[] | undefined;

interface RawOutput {
  output_type?: string;
  name?: string;
  text?: Multiline;
  data?: Record<string, Multiline>;
  execution_count?: number | null;
}

interface RawCell {
  cell_type?: string;
  id?: string;
  source?: Multiline;
  outputs?: RawOutput[];
  execution_count?: number | null;
}

interface RawNotebook {
  cells?: RawCell[];
  metadata?: {
    kernelspec?: { display_name?: string; name?: string; language?: string };
    language_info?: { name?: string };
  };
}

function joinLines(value: Multiline): string {
  return Array.isArray(value) ? value.join('') : (value ?? '');
}

/** Index of the closing quote, or -1 when the literal never closes. */
function endOfString(src: string, open: number, quote: string): number {
  for (let i = open + 1; i < src.length; i++) {
    if (src[i] === '\\') i++;
    else if (src[i] === quote) return i;
  }
  return -1;
}

/** Contents of the bracket group opened at `open`, skipping over string literals. */
function balanced(src: string, open: number): string | null {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === '"' || c === "'") {
      const end = endOfString(src, i, c);
      if (end < 0) return null;
      i = end;
    } else if (c === '[' || c === '{' || c === '(') depth++;
    else if (c === ']' || c === '}' || c === ')') {
      if (--depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

/**
 * The Blob argument is double-quoted chunks spliced by `+ "script" +`, so every literal has
 * to be JSON.parsed and concatenated. Never eval: this is archived third-party output.
 */
export function extractEmbeddedDocument(code: string): string | null {
  try {
    const call = code.indexOf('new Blob([');
    if (call < 0) return null;
    const args = balanced(code, code.indexOf('[', call));
    if (args === null) return null;

    let doc = '';
    for (let i = 0; i < args.length; i++) {
      const c = args[i];
      if (c !== '"' && c !== "'") continue;
      const end = endOfString(args, i, c);
      if (end < 0) return null;
      if (c === '"') doc += JSON.parse(args.slice(i, end + 1)) as string;
      i = end;
    }

    if (!/^<!doctype html/i.test(doc.trimStart())) return null;
    return doc.replaceAll('molstar@latest', `molstar@${MOLSTAR_VERSION}`);
  } catch {
    return null;
  }
}

function richest(data: Record<string, Multiline>): NotebookOutput | null {
  // application/vnd.google.colaboratory.intrinsic+json is a formatter hint, not a payload.
  const mime = MIME_ORDER.find((m) => data[m] !== undefined);
  if (!mime) return null;
  const raw = joinLines(data[mime]);

  if (mime === 'image/png' || mime === 'image/jpeg' || mime === 'image/gif') {
    return { kind: 'image', mime, base64: raw.replace(/\s+/g, '') };
  }
  if (mime === 'application/javascript') {
    const document = extractEmbeddedDocument(raw);
    return document
      ? { kind: 'embed', label: EMBED_LABEL, document }
      : { kind: 'javascript', code: raw };
  }
  if (mime === 'text/html' || mime === 'image/svg+xml') {
    return MOLSTAR_STUB.test(raw) ? null : { kind: 'html', html: raw };
  }
  const text = raw.replace(/\s+$/, '');
  return text && text.trim() !== JS_REPR ? { kind: 'text', text } : null;
}

function toOutputs(raws: RawOutput[]): NotebookOutput[] {
  const outputs: NotebookOutput[] = [];
  for (const raw of raws) {
    if (raw.output_type === 'stream') {
      const name = raw.name === 'stderr' ? 'stderr' : 'stdout';
      const text = joinLines(raw.text).replace(ANSI, '');
      const last = outputs.at(-1);
      // A 101-line progress log arrives as 101 streams; render it as one block.
      if (last?.kind === 'stream' && last.name === name) last.text += text;
      else outputs.push({ kind: 'stream', name, text });
      continue;
    }
    const mapped = raw.data ? richest(raw.data) : null;
    if (mapped) outputs.push(mapped);
  }
  return outputs.flatMap((o) => {
    if (o.kind !== 'stream') return [o];
    const text = o.text.replace(/\s+$/, '');
    return text ? [{ ...o, text }] : [];
  });
}

function inlineText(md: string): string {
  return md
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/(\*\*\*|___)(.+?)\1/g, '$2')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(.+?)\1/g, '$2')
    .replace(/\\([\\`*_{}[\]()#+\-.!])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** One slugger per notebook so duplicate headings get rehype-slug's -1/-2 suffixes. */
function collectToc(cells: RawCell[]): TOCItemType[] {
  const slugger = new Slugger();
  const toc: TOCItemType[] = [];

  for (const cell of cells) {
    if (cell.cell_type !== 'markdown') continue;
    let fenced = false;
    for (const line of joinLines(cell.source).split('\n')) {
      if (/^ {0,3}(```|~~~)/.test(line)) {
        fenced = !fenced;
        continue;
      }
      if (fenced) continue;
      const heading = line.match(/^ {0,3}(#{1,6})\s+(.*)$/);
      if (!heading) continue;
      const title = inlineText(heading[2].replace(/\s+#+\s*$/, ''));
      if (!title) continue;
      const url = `#${slugger.slug(title)}`;
      if (heading[1].length <= 4) toc.push({ title, url, depth: heading[1].length });
    }
  }
  return toc;
}

function parse(raw: RawNotebook): Notebook {
  const raws = raw.cells ?? [];
  const cells: NotebookCell[] = [];

  raws.forEach((cell, index) => {
    const id = cell.id ?? `cell-${index}`;
    const source = joinLines(cell.source).replace(/\s+$/, '');
    if (cell.cell_type === 'markdown') {
      if (source.trim()) cells.push({ kind: 'markdown', id, source });
      return;
    }
    if (cell.cell_type !== 'code') return;
    const outputs = toOutputs(cell.outputs ?? []);
    if (!source.trim() && outputs.length === 0) return;
    cells.push({
      kind: 'code',
      id,
      source,
      executionCount: cell.execution_count ?? null,
      outputs,
    });
  });

  const kernelspec = raw.metadata?.kernelspec;
  return {
    cells,
    toc: collectToc(raws),
    kernel: kernelspec?.display_name ?? kernelspec?.name,
    language: raw.metadata?.language_info?.name ?? kernelspec?.language ?? 'python',
  };
}

/** Nested names are the norm (two notebooks share the basename single-site-analysis). */
function relative(name: string): string {
  const bad = (why: string) => new Error(`notebook: "${name}" ${why}`);
  if (!name.trim()) throw bad('is empty');
  if (name.includes('\\')) throw bad('contains a backslash; use "/" between segments');
  if (name.startsWith('/') || path.isAbsolute(name)) throw bad('is an absolute path');

  const trimmed = name.replace(/^\.\//, '').replace(/^content\/notebooks\//, '');
  const segments = trimmed.split('/');
  if (segments.some((s) => s === '' || s === '.' || s === '..')) {
    throw bad('has an empty, "." or ".." path segment');
  }
  return segments.join('/').replace(/\.ipynb$/i, '') + '.ipynb';
}

const load = cache(async (rel: string): Promise<Notebook> => {
  const full = path.join(NOTEBOOK_DIR, rel);
  if (!full.startsWith(`${NOTEBOOK_DIR}${path.sep}`)) {
    throw new Error(`notebook: "${rel}" resolves outside content/notebooks/`);
  }

  let src: string;
  try {
    src = await readFile(full, 'utf8');
  } catch {
    throw new Error(`notebook: cannot read "${rel}" (looked in ${full})`);
  }

  let raw: RawNotebook;
  try {
    raw = JSON.parse(src) as RawNotebook;
  } catch (error) {
    throw new Error(`notebook: "${rel}" is not valid JSON (${(error as Error).message})`);
  }

  if (!Array.isArray(raw.cells)) throw new Error(`notebook: "${rel}" has no cells array`);
  return parse(raw);
});

export async function readNotebook(name: string): Promise<Notebook> {
  return load(relative(name));
}
