import { createSearchAPI, type AdvancedIndex } from 'fumadocs-core/search/server';
import { structure, type StructuredData } from 'fumadocs-core/mdx-plugins';
import { findPath, type Root } from 'fumadocs-core/page-tree';
import { descriptionText } from '@/lib/description';
import { modelSearchIndexes } from '@/lib/models';
import { source, structureOptions } from '@/lib/source';
import { generatedSearchText } from '@/lib/page-text';

const words = new Intl.Segmenter('en', { granularity: 'word' });

/** `a.b.c_d` also as `b.c_d`, `c_d`, `a`, `c`, `d`: search only matches word starts. */
function identifierParts(word: string): string[] {
  const parts = word.split('.').filter(Boolean);
  return [
    ...parts.slice(1).map((_, i) => parts.slice(i + 1).join('.')),
    ...parts.flatMap((part) => [part, ...part.split('_').filter(Boolean)]),
  ];
}

/** The default, plus identifier parts for indexed text; `prop` is unset for a query. */
const tokenizer = {
  language: 'multilingual',
  normalizationCache: new Map<string, string>(),
  tokenize(raw: string, _language?: string, prop?: string): string[] {
    // Indexed text is Markdown, and `input\_type` would split at the backslash.
    const text = raw.replace(/\\([!-/:-@[-`{-~])/g, '$1').toLowerCase();
    const tokens = new Set<string>();
    for (const { segment, isWordLike } of words.segment(text)) {
      if (!isWordLike) continue;
      tokens.add(segment);
      if (prop) for (const part of identifierParts(segment)) tokens.add(part);
    }
    return [...tokens];
  },
};

const EMPTY: StructuredData = { headings: [], contents: [] };

const merge = (a: StructuredData, b: StructuredData): StructuredData => ({
  headings: [...a.headings, ...b.headings],
  contents: [...a.contents, ...b.contents],
});

/**
 * Every MDX page, then the model pages, which are built from the platform's API rather than the
 * source. `structuredData` is extracted at compile time, so a page whose body renders at request
 * time — every notebook, Python API and REST page — has only its MDX wrapper there; the generated
 * body is structured from its text and appended.
 */
export const searchApi = createSearchAPI('advanced', {
  tokenizer,
  async indexes() {
    const tree = source.getPageTree();
    const pages = await Promise.all(
      source.getPages().map(
        async (page): Promise<AdvancedIndex> => ({
          id: page.url,
          url: page.url,
          title: page.data.title ?? page.url,
          description: descriptionText(page.data.description),
          breadcrumbs: breadcrumbs(tree, page.url),
          structuredData: merge(
            typeof page.data.structuredData === 'function' ? EMPTY : page.data.structuredData,
            structure(await generatedSearchText(page), [], structureOptions),
          ),
        }),
      ),
    );
    return [...pages, ...(await modelSearchIndexes())];
  },
});

/** The folders above a page, root excluded. */
function breadcrumbs(tree: Root, url: string) {
  const path = findPath(tree.children, (node) => node.type === 'page' && node.url === url);
  if (!path) return undefined;
  return path.slice(0, -1).map((node) => node.name).filter(
    (name): name is string => typeof name === 'string' && name.length > 0,
  );
}
