import { source } from '@/lib/source';
import { pageText } from '@/lib/page-text';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';
export const revalidate = false;

/** Every page's full text, generated bodies included — see lib/page-text.ts. */
export async function GET() {
  const pages = source.getPages();
  const sections = await Promise.all(
    pages.map(async (page) => {
      const text = await pageText(page);
      return [
        `# ${page.data.title ?? page.url}`,
        `URL: ${SITE.url}${page.url}`,
        page.data.description ? `\n${page.data.description}` : null,
        text ? `\n${text}` : null,
      ]
        .filter((line) => line !== null)
        .join('\n');
    }),
  );

  return new Response(sections.join('\n\n---\n\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
