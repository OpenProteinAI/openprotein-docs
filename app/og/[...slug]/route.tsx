import { notFound } from 'next/navigation';
import { generateOGImage } from 'fumadocs-ui/og';
import { source } from '@/lib/source';

/**
 * `/og/<page slug>/image.png`, prerendered — one PNG per page.
 *
 * Not `opengraph-image.tsx` beside the docs page: Next rejects that at build time, since a
 * catch-all must be the last segment of a route.
 */
export async function GET(_request: Request, props: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await props.params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  return generateOGImage({
    title: page.data.title ?? 'OpenProtein.AI docs',
    description: page.data.description,
    site: 'OpenProtein.AI docs',
    // --brand-1-fill and its dark ink; an OG image has no theme to follow.
    primaryColor: '#225EDB',
    primaryTextColor: '#65a3ff',
  });
}

export function generateStaticParams() {
  return source.generateParams().map((params) => ({ slug: [...params.slug, 'image.png'] }));
}
