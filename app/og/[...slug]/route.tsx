import { notFound } from 'next/navigation';
import { generateOGImage } from 'fumadocs-ui/og';
import { descriptionText } from '@/lib/description';
import { getBaseModels } from '@/lib/models';
import { MODELS_DESCRIPTION, MODELS_TITLE, MODELS_URL, versionPageUrl } from '@/lib/models-tree';
import { source } from '@/lib/source';

/** Pages outside the MDX source, which have no frontmatter to read: /models, its models and their versions. */
async function routePages(): Promise<Record<string, { title: string; description: string }>> {
  return {
    [MODELS_URL.slice(1)]: { title: MODELS_TITLE, description: MODELS_DESCRIPTION },
    ...Object.fromEntries(
      (await getBaseModels()).flatMap((view) =>
        view.versions.map((card) => {
          const isBase = card.id === view.defaultVersion;
          return [
            versionPageUrl(view, card.id).slice(1),
            { title: isBase ? view.name : card.name, description: isBase ? view.summary : card.description },
          ];
        }),
      ),
    ),
  };
}

/**
 * `/og/<page slug>/image.png`, prerendered — one PNG per page.
 *
 * Not `opengraph-image.tsx` beside the docs page: Next rejects that at build time, since a
 * catch-all must be the last segment of a route.
 */
export async function GET(_request: Request, props: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await props.params;
  const route = (await routePages())[slug.slice(0, -1).join('/')];
  const page = route ? undefined : source.getPage(slug.slice(0, -1));
  if (!route && !page) notFound();

  return generateOGImage({
    title: route?.title ?? page?.data.title ?? 'OpenProtein.AI docs',
    description: route?.description ?? descriptionText(page?.data.description),
    site: 'OpenProtein.AI docs',
    // --brand-1-fill and its dark ink; an OG image has no theme to follow.
    primaryColor: '#225EDB',
    primaryTextColor: '#65a3ff',
  });
}

export async function generateStaticParams() {
  return [
    ...source.generateParams().map((params) => params.slug),
    ...Object.keys(await routePages()).map((path) => path.split('/')),
  ].map((slug) => ({ slug: [...slug, 'image.png'] }));
}
