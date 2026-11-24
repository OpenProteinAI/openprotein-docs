import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { notFound } from 'next/navigation';
import { source } from '@/lib/source';

/** A docs page's MDX source, for "Edit this page". */
export async function GET(_request: Request, props: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await props.params;
  const leaf = slug.at(-1) ?? '';
  if (!leaf.endsWith('.json')) notFound();
  const page = source.getPage([...slug.slice(0, -1), leaf.slice(0, -'.json'.length)]);
  if (!page) notFound();

  const mdx = await readFile(path.join(process.cwd(), 'content', 'docs', page.path), 'utf8');
  return Response.json({ mdx });
}

export function generateStaticParams() {
  return source
    .generateParams()
    .filter(({ slug }) => slug.length > 0)
    .map(({ slug }) => ({ slug: [...slug.slice(0, -1), `${slug[slug.length - 1]}.json`] }));
}
