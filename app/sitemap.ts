import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages().map((page) => ({
    url: `${SITE.url}${page.url}`,
    changeFrequency: 'weekly' as const,
    // The reference pages are generated from a pinned SDK and the specs; the prose is not.
    priority: page.url.startsWith('/python-api/api-reference') || page.url.startsWith('/rest-api')
      ? 0.6
      : 0.8,
  }));

  return [{ url: SITE.url, changeFrequency: 'weekly', priority: 1 }, ...pages];
}
