import type { MetadataRoute } from 'next';
import { getBaseModels } from '@/lib/models';
import { MODELS_URL, versionPageUrl } from '@/lib/models-tree';
import { source } from '@/lib/source';
import { PY_API_URL, REST_API_URL, SITE } from '@/lib/site';

export const dynamic = 'force-static';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = source.getPages().map((page) => ({
    url: `${SITE.url}${page.url}`,
    changeFrequency: 'weekly' as const,
    // The reference pages are generated from a pinned SDK and the specs; the prose is not.
    priority: page.url.startsWith(PY_API_URL) || page.url.startsWith(REST_API_URL)
      ? 0.6
      : 0.8,
  }));

  return [
    { url: SITE.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE.url}${MODELS_URL}`, changeFrequency: 'weekly', priority: 0.8 },
    ...(await getBaseModels()).flatMap((view) =>
      view.versions.map((card) => ({
        url: `${SITE.url}${versionPageUrl(view, card.id)}`,
        changeFrequency: 'weekly' as const,
        priority: card.id === view.defaultVersion ? 0.8 : 0.7,
      })),
    ),
    ...pages,
  ];
}
