import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { cache } from 'react';
import { parseNotebook, type Notebook, type RawNotebook } from '@/lib/notebook-parse';

export type { Notebook, NotebookCell, NotebookOutput } from '@/lib/notebook-parse';

const NOTEBOOK_DIR = path.join(process.cwd(), 'content', 'notebooks');

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
  return parseNotebook(raw);
});

export async function readNotebook(name: string): Promise<Notebook> {
  return load(relative(name));
}

/** Every notebook as its `notebook:` value, e.g. `tutorials/learn/x.ipynb`. */
export async function listNotebooks(dir = NOTEBOOK_DIR, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory()) return listNotebooks(path.join(dir, entry.name), `${prefix}${entry.name}/`);
      return entry.name.endsWith('.ipynb') ? [`${prefix}${entry.name}`] : [];
    }),
  );
  return found.flat().sort();
}
