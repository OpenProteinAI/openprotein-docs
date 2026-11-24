import type { NotebookOutput } from '@/lib/notebook-parse';
import { withBase } from '@/lib/base-path';

/** Mol* documents stay server-side; the preview gets their size. */
export type PreviewOutput =
  | Exclude<NotebookOutput, { kind: 'embed' }>
  /** `src` is set for a local notebook's blob URL. */
  | { kind: 'embed'; label: string; bytes: number; index: number; src?: string };

export type PreviewCell =
  | { kind: 'markdown'; html: string }
  | { kind: 'code'; source: string; executionCount: number | null; outputs: PreviewOutput[] };

export interface PreviewNotebook {
  language: string;
  cells: PreviewCell[];
}

/** Frontmatter `notebook:` as the page reads it, e.g. `tutorials/x`; null when unsafe. */
export function notebookPath(file: string): string | null {
  const rel = file
    .trim()
    .replace(/^\.\//, '')
    .replace(/^content\/notebooks\//, '')
    .replace(/\.ipynb$/i, '');
  const segments = rel.split('/');
  if (!rel || segments.some((segment) => !segment || segment === '.' || segment === '..' || segment.includes('\\'))) return null;
  return rel;
}

/** The build-time JSON for a notebook path. */
export function notebookJsonUrl(rel: string): string {
  return withBase(`/editor/notebook/${rel.split('/').map(encodeURIComponent).join('/')}.json`);
}

/** Every notebook path a page can name. */
export const NOTEBOOKS_URL = withBase('/editor/notebooks.json');
