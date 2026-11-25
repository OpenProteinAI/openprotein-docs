import { notFound } from 'next/navigation';
import { renderCellProse } from '@/components/notebook/notebook-view';
import { listNotebooks, readNotebook, type Notebook } from '@/lib/notebook';
import type { PreviewCell, PreviewNotebook } from '@/lib/editor/notebook';

/** A notebook for the editor's preview, its markdown rendered as the page renders it. */
export async function GET(_request: Request, props: { params: Promise<{ file: string[] }> }) {
  const { file } = await props.params;
  const leaf = file.at(-1) ?? '';
  if (!leaf.endsWith('.json')) notFound();
  const rel = [...file.slice(0, -1), leaf.slice(0, -'.json'.length)].join('/');

  let notebook: Notebook;
  try {
    notebook = await readNotebook(rel);
  } catch {
    notFound();
  }

  const prose = await Promise.all(
    notebook.cells.map((cell) => (cell.kind === 'markdown' ? renderCellProse(cell.source) : null)),
  );
  // Embeds are numbered across the notebook, as `notebookEmbeds` counts them.
  let embeds = 0;
  const cells = notebook.cells.map(
    (cell, index): PreviewCell =>
      cell.kind === 'markdown'
        ? { kind: 'markdown', html: prose[index] ?? '' }
        : {
            kind: 'code',
            source: cell.source,
            executionCount: cell.executionCount,
            outputs: cell.outputs.map((output) =>
              output.kind === 'embed'
                ? { kind: 'embed', label: output.label, bytes: output.document.length, index: embeds++ }
                : output,
            ),
          },
  );

  return Response.json({ language: notebook.language, cells } satisfies PreviewNotebook);
}

export async function generateStaticParams() {
  return (await listNotebooks()).map((file) => ({ file: file.replace(/\.ipynb$/, '.json').split('/') }));
}
