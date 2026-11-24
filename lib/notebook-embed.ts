import { withBase } from '@/lib/base-path';
import type { Notebook, NotebookOutput } from '@/lib/notebook-parse';

type Embed = Extract<NotebookOutput, { kind: 'embed' }>;

/** Mol* documents in cell order; a viewer's index counts across the whole notebook. */
export function notebookEmbeds(notebook: Notebook): Embed[] {
  return notebook.cells.flatMap((cell) =>
    cell.kind === 'code' ? cell.outputs.filter((output): output is Embed => output.kind === 'embed') : [],
  );
}

export function embedLeaf(index: number): string {
  return `${index + 1}.html`;
}

/** A path rather than a query string, so the static export writes each viewer as a file. */
export function embedLink(file: string, index: number): { src: string; download: { href: string; name: string } } {
  const stem = file.replace(/\.ipynb$/i, '').split('/');
  const src = withBase(`/api/notebook-embed/${stem.map(encodeURIComponent).join('/')}/${embedLeaf(index)}`);
  return { src, download: { href: src, name: `${stem.at(-1)}-${embedLeaf(index)}` } };
}
