import Slugger from 'github-slugger';
import type { TOCItemType } from 'fumadocs-core/toc';
import { sanitizeHtml } from '@/lib/sanitize-html';

// Browser-safe: the editor parses local notebooks too.

/** The archived viewers load molstar@latest; pin to what the platform app ships. */
const MOLSTAR_VERSION = '5.11.0';

const EMBED_LABEL = 'Mol* structure viewer';

/** The empty div a Mol* JS output writes its iframe into. Real DataFrame HTML must survive. */
const MOLSTAR_STUB = /^\s*<div\s+id="molstar_[0-9a-fA-F-]+"\s*>\s*<\/div>\s*$/;

const JS_REPR = '<IPython.core.display.Javascript object>';

/** Streams and IPython docstring results carry SGR colour codes even with no errors. */
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

export interface RawNotebook {
  cells?: RawCell[];
  metadata?: {
    kernelspec?: { display_name?: string; name?: string; language?: string };
    language_info?: { name?: string };
  };
}

/** UTF-8 safe, without Buffer. */
function base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
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

/** A value pandas right-aligns: a number, a boolean, or a missing entry. */
const NUMERIC = /^-?(\d+(\.\d+)?([eE][-+]\d+)?|nan|inf|none|true|false)$/i;

/** The row `df.head()` prints when it elides the middle; it says nothing about the column. */
const ELLIPSIS = /^(\.{3}|\u2026)$/;

const ROW = /<tr\b[\s\S]*?<\/tr>/gi;

function cellText(cell: string): string {
  return cell
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Right-align the cells of the numeric columns. `right` is indexed by data column; a header
 * or MultiIndex row opens with extra cells for the index levels, which stay left-aligned.
 */
function alignCells(chunk: string, tag: 'th' | 'td', right: boolean[]): string {
  const open = new RegExp(`<${tag}\\b`, 'g');
  return chunk.replace(ROW, (row) => {
    const offset = Math.max(0, (row.match(open)?.length ?? 0) - right.length);
    let seen = 0;
    return row.replace(open, (cell) => (right[seen++ - offset] ? `${cell} align="right"` : cell));
  });
}

/**
 * pandas hands us a bordered, fully right-aligned grid plus a `<style scoped>` block that no
 * browser scopes. Strip both and mark the genuinely numeric columns; `.nb-html` does the rest.
 */
function normalizeDataFrame(html: string): string {
  const cleaned = html
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/ border="1"/g, '')
    .replace(/(<tr)\s+style="text-align:\s*right;?"/gi, '$1');

  const head = /<thead\b[\s\S]*?<\/thead>/i.exec(cleaned)?.[0];
  const body = /<tbody\b[\s\S]*?<\/tbody>/i.exec(cleaned)?.[0];
  if (!head || !body) return cleaned;

  const rows = (body.match(ROW) ?? []).map((row) =>
    (row.match(/<td\b[\s\S]*?<\/td>/gi) ?? []).map(cellText),
  );
  const right = Array.from({ length: rows[0]?.length ?? 0 }, (_, col) => {
    const values = rows.map((row) => row[col] ?? '').filter((v) => v && !ELLIPSIS.test(v));
    return values.length > 0 && values.every((v) => NUMERIC.test(v));
  });

  return cleaned
    .replace(head, () => alignCells(head, 'th', right))
    .replace(body, () => alignCells(body, 'td', right));
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
  if (mime === 'image/svg+xml') {
    // Shown through <img>, which runs nothing inside the SVG.
    return { kind: 'image', mime, base64: base64(raw) };
  }
  if (mime === 'text/html') {
    if (MOLSTAR_STUB.test(raw)) return null;
    return { kind: 'html', html: sanitizeHtml(normalizeDataFrame(raw)) };
  }
  const text = raw.replace(ANSI, '').replace(/\s+$/, '');
  return text && text.trim() !== JS_REPR ? { kind: 'text', text } : null;
}

/**
 * Apply terminal carriage-return semantics: a tqdm progress bar rewrites one line, and the
 * browser's HTML parser turns a stray \r into \n, so leaving them in breaks hydration.
 */
function collapseCarriageReturns(text: string): string {
  if (!text.includes('\r')) return text;
  return text
    .split('\n')
    .map((line) =>
      line.includes('\r')
        ? line.split('\r').reduce((acc, frame) => frame + acc.slice(frame.length), '')
        : line,
    )
    .join('\n');
}

function toOutputs(raws: RawOutput[]): NotebookOutput[] {
  const merged: NotebookOutput[] = [];
  for (const raw of raws) {
    if (raw.output_type === 'stream') {
      const name = raw.name === 'stderr' ? 'stderr' : 'stdout';
      const text = joinLines(raw.text).replace(ANSI, '');
      const last = merged.at(-1);
      // A 101-line progress log arrives as 101 streams; render it as one block.
      if (last?.kind === 'stream' && last.name === name) last.text += text;
      else merged.push({ kind: 'stream', name, text });
      continue;
    }
    const mapped = raw.data ? richest(raw.data) : null;
    if (mapped) merged.push(mapped);
  }

  const outputs: NotebookOutput[] = [];
  for (const output of merged) {
    if (output.kind !== 'stream') {
      outputs.push(output);
      continue;
    }
    const text = collapseCarriageReturns(output.text).replace(/\s+$/, '');
    if (text) outputs.push({ ...output, text });
  }
  return outputs;
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

export function parseNotebook(raw: RawNotebook): Notebook {
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

/** Cell 0 of 8 notebooks links three badge SVGs at the old source/ tree; <NotebookBadges> replaces them. */
export const STALE_BADGE = /^\[!\[[^\]]*\]\([^)]*_static\/[a-z-]*badge\.svg\)\]\([^)]*\)[ \t]*$/gm;
