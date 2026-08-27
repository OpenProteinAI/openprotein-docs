import { llms } from 'fumadocs-core/source';
import { source } from '@/lib/source';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';
export const revalidate = false;

/** An index of every page, per llmstxt.org. `llms-full.txt` carries the bodies. */
export function GET() {
  const body = [
    '# OpenProtein.AI documentation',
    '',
    '> Documentation for the OpenProtein.AI platform, Python API and REST API.',
    '',
    `Full text of every page: ${SITE.url}/llms-full.txt`,
    '',
    // `llms()` emits site-relative links; a consumer fetching this file has no origin.
    llms(source).index().replaceAll('](/', `](${SITE.url}/`),
  ].join('\n');

  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
