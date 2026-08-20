import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import type { TOCItemType } from 'fumadocs-core/toc';

const SPEC_DIR = path.join(process.cwd(), 'specs');
const CONTENT_DIR = path.join(process.cwd(), 'content', 'docs');

export type PyKind = 'class' | 'function' | 'method' | 'property' | 'attribute';

export interface PySourceRef {
  file: string;
  line: number;
  end: number;
}

export interface PySectionItem {
  name?: string | null;
  type?: string | null;
  default?: string | null;
  text?: string | null;
}

export type PySection =
  | { kind: 'text'; text: string }
  | { kind: 'parameters' | 'other parameters' | 'raises' | 'attributes'; items: PySectionItem[] }
  | { kind: 'returns'; items: PySectionItem[] }
  | { kind: 'admonition'; title?: string | null; text: string }
  | { kind: 'examples'; items: string[] };

export interface PyMember {
  name: string;
  kind: PyKind;
  doc: string | null;
  inherited_from: string | null;
  source: PySourceRef | null;
  signature?: string;
  returns?: string | null;
  overloads?: string[];
  annotation?: string | null;
  value?: string | null;
  parsed?: PySection[];
  /** pydantic's model_config, which exists only on BaseModel. */
  synthetic?: string;
  /** Documented by the class docstring's Attributes section but absent from the class body. */
  from_docstring?: boolean;
}

export interface PyEntry {
  name: string;
  path: string;
  kind: 'class' | 'function';
  signature: string;
  bases?: string[];
  doc: string | null;
  parsed?: PySection[];
  module?: string | null;
  source: PySourceRef | null;
  members?: PyMember[];
  returns?: string | null;
  section?: string | null;
  /** The reference page that documents it; null for autosummary-only objects. */
  page?: string | null;
  summary_only?: boolean;
}

export interface PyDocument {
  module: string;
  entries: PyEntry[];
  sdk: { package: string; version: string };
  source: { repository: string; ref: string };
  generator: string;
}

/**
 * cache() rather than a module-level Map: a module-level cache would go stale the moment
 * `pnpm sync:pyapi` rewrites the file, because specs/ is read with readFile and never
 * imported, so nothing invalidates it. Per-request is the right lifetime.
 */
const readDocument = cache(async (module: string): Promise<PyDocument> => {
  const file = path.join(SPEC_DIR, `${module}.json`);
  return JSON.parse(await readFile(file, 'utf8')) as PyDocument;
});

/** `openprotein.fold.FoldAPI` -> `openprotein.fold`. */
function moduleOf(dotted: string): string {
  const cut = dotted.lastIndexOf('.');
  return cut === -1 ? dotted : dotted.slice(0, cut);
}

/**
 * Throws on a path that does not resolve. Rendering nothing would hide a typo in a page for
 * as long as nobody compares it to the old site.
 */
export const readPyEntry = cache(
  async (dotted: string): Promise<{ entry: PyEntry; document: PyDocument }> => {
    const module = moduleOf(dotted);
    let document: PyDocument;
    try {
      document = await readDocument(module);
    } catch {
      throw new Error(
        `No generated document for "${module}" (needed by ${dotted}). ` +
          `Run pnpm sync:pyapi, or check the path.`,
      );
    }
    const entry = document.entries.find((candidate) => candidate.path === dotted);
    if (!entry) {
      throw new Error(
        `"${dotted}" is not in specs/${module}.json. ` +
          `Known: ${document.entries.map((e) => e.path).join(', ')}`,
      );
    }
    return { entry, document };
  },
);

export interface PySummaryRow {
  path: string;
  signature: string;
  summary: string;
  /** null when no reference page documents it, so the row renders unlinked. */
  page: string | null;
}

export async function readPySummary(paths: string[]): Promise<PySummaryRow[]> {
  return Promise.all(
    paths.map(async (dotted) => {
      const { entry } = await readPyEntry(dotted);
      return {
        path: dotted,
        signature: entry.signature,
        // The autosummary column is the docstring's first sentence.
        summary: firstSentence(entry.doc),
        page: entry.page ?? null,
      };
    }),
  );
}

/** `:py:class:`~openprotein.fold.FoldAPI`` -> `FoldAPI`; ``x`` -> x. Plain text, for a
 *  table cell and a <meta> description — not markdown, so nothing is linked here. */
function plainText(text: string): string {
  return text
    .replace(/:(?:py:)?(?:class|meth|func|attr|obj|mod|exc|data)::?`~?([^`]+)`/g, (_m, target: string) =>
      target.split('.').pop() ?? target,
    )
    .replace(/``?([^`]+)``?/g, '$1');
}

function firstSentence(text: string | null): string {
  if (!text) return '';
  const paragraph = plainText(text.trim().split(/\n\s*\n/)[0]).replace(/\s+/g, ' ').trim();
  const stop = paragraph.search(/\.(\s|$)/);
  return stop === -1 ? paragraph : paragraph.slice(0, stop + 1);
}

/**
 * GitHub, at the tag the document was generated from — not sphinx.ext.viewcode's in-site
 * `_modules/**` copy of the SDK, which this site does not carry.
 */
export function pySourceUrl(document: PyDocument, source: PySourceRef | null): string | null {
  // griffe's dataclasses extension synthesises __init__ with line 0.
  if (!source || !source.line) return null;
  const { repository, ref } = document.source;
  const range = source.end > source.line ? `#L${source.line}-L${source.end}` : `#L${source.line}`;
  return `${repository}/blob/${ref}/${source.file}${range}`;
}

/**
 * The dotted path, verbatim — the same id Sphinx used, so every inbound deep link such as
 * `…/fold.html#openprotein.fold.FoldAPI.get_results` still resolves. Deliberately not
 * slugified.
 */
export function pyAnchor(dotted: string): string {
  return dotted;
}

const PY_CLASS = /<PyClass\s+path=["']([^"']+)["']/g;
const HEADING = /^(#{2,4})\s+(.+?)\s*$/;

/**
 * Interleave one TOC entry per `<PyClass>` into the page's own headings.
 *
 * The class blocks render at request time, so fumadocs' compile-time TOC sees only the `##`
 * headings and every class under them would be unnavigable. Matching is positional against
 * the raw MDX rather than by re-slugifying heading text — re-slugging is how anchors drift.
 */
export async function pyToc(pagePath: string, toc: TOCItemType[]): Promise<TOCItemType[]> {
  let raw: string;
  try {
    raw = await readFile(path.join(CONTENT_DIR, pagePath), 'utf8');
  } catch {
    return toc;
  }

  const lines = raw.split('\n');
  const headingDepths = toc.map((item) => item.depth);
  let headingIndex = 0;
  const out: TOCItemType[] = [];
  let fenced = false;

  for (const line of lines) {
    if (line.startsWith('```')) fenced = !fenced;
    if (fenced) continue;

    const heading = HEADING.exec(line);
    if (heading) {
      if (headingIndex < toc.length) out.push(toc[headingIndex]);
      headingIndex += 1;
      continue;
    }

    PY_CLASS.lastIndex = 0;
    const match = PY_CLASS.exec(line);
    if (!match) continue;
    const dotted = match[1];
    // One level below the heading it sits under, so the rail nests it.
    const parent = headingDepths[headingIndex - 1] ?? 2;
    out.push({
      title: dotted.split('.').pop() ?? dotted,
      url: `#${pyAnchor(dotted)}`,
      depth: Math.min(parent + 1, 4),
    });
  }

  // Any heading the scan did not reach (none today, but a trailing heading after the last
  // PyClass must not vanish).
  out.push(...toc.slice(headingIndex));
  return out;
}
