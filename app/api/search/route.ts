import { createFromSource } from 'fumadocs-core/search/server';
import { structure } from 'fumadocs-core/mdx-plugins';
import { source } from '@/lib/source';
import { pageText } from '@/lib/page-text';

/**
 * `structuredData` is extracted at compile time, so a page whose body renders at request time —
 * every notebook, Python API and REST page — indexed as an empty wrapper. That was a regression
 * against Sphinx, whose index covered notebook prose. `buildIndex` re-derives it from the full
 * text instead.
 */
export const { GET } = createFromSource(source, {
  async buildIndex(page) {
    return {
      id: page.url,
      url: page.url,
      title: page.data.title ?? page.url,
      description: page.data.description,
      structuredData: structure(await pageText(page)),
    };
  },
});
