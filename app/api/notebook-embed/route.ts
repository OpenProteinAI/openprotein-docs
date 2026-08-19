import { readNotebook } from '@/lib/notebook';

/** Serves a recovered Mol* document so it never enters the page's RSC payload. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const file = url.searchParams.get('file');
  const index = Number(url.searchParams.get('index'));
  const download = url.searchParams.get('download') === '1';

  if (!file || !Number.isInteger(index) || index < 0) {
    return new Response('Bad request', { status: 400 });
  }

  let notebook;
  try {
    notebook = await readNotebook(file);
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const embeds = notebook.cells.flatMap((cell) =>
    cell.kind === 'code' ? cell.outputs.filter((o) => o.kind === 'embed') : [],
  );
  const embed = embeds[index];
  if (!embed || embed.kind !== 'embed') return new Response('Not found', { status: 404 });

  const name = `${file.split('/').pop()?.replace(/\.ipynb$/i, '') ?? 'viewer'}-${index + 1}.html`;

  return new Response(embed.document, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      ...(download ? { 'Content-Disposition': `attachment; filename="${name}"` } : {}),
    },
  });
}
