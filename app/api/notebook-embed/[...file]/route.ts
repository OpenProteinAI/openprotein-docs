import { notFound } from 'next/navigation';
import { listNotebooks, readNotebook, type Notebook } from '@/lib/notebook';
import { embedLeaf, notebookEmbeds } from '@/lib/notebook-embed';

/** One recovered Mol* document, served on its own so it never enters the page's RSC payload. */
export async function GET(_request: Request, props: { params: Promise<{ file: string[] }> }) {
  const { file } = await props.params;
  const position = /^([1-9]\d*)\.html$/.exec(file.at(-1) ?? '');
  if (!position || file.length < 2) notFound();

  let notebook: Notebook;
  try {
    notebook = await readNotebook(file.slice(0, -1).join('/'));
  } catch {
    notFound();
  }

  const embed = notebookEmbeds(notebook)[Number(position[1]) - 1];
  if (!embed) notFound();

  return new Response(embed.document, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function generateStaticParams() {
  const files = await listNotebooks();
  const params = await Promise.all(
    files.map(async (file) =>
      notebookEmbeds(await readNotebook(file)).map((_, index) => ({
        file: [...file.replace(/\.ipynb$/, '').split('/'), embedLeaf(index)],
      })),
    ),
  );
  return params.flat();
}
