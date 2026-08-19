import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Serves the raw .ipynb as a download so the button works without a GitHub push. */
export async function GET(request: Request) {
  const file = new URL(request.url).searchParams.get('file');
  if (!file || !/^[\w.-]+(?:\/[\w.-]+)*\.ipynb$/i.test(file) || file.split('/').includes('..')) {
    return new Response('Bad request', { status: 400 });
  }

  try {
    const body = await readFile(join(process.cwd(), 'content/notebooks', file));
    return new Response(new Uint8Array(body), {
      headers: {
        'Content-Type': 'application/x-ipynb+json',
        'Content-Disposition': `attachment; filename="${file.split('/').pop()}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
