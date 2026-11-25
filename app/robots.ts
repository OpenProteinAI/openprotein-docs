import type { MetadataRoute } from 'next';
import { BASE_PATH } from '@/lib/base-path';
import { SITE } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: `${BASE_PATH}/`,
        // Nothing under /api is a document.
        disallow: [`${BASE_PATH}/api/`],
      },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
