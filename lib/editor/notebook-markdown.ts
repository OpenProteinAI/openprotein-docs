import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeStringify from 'rehype-stringify';
import type { Element } from 'hast';
import { buildMarkdown, type Highlight } from '@/lib/markdown-core';
import { mathErrorBox, rehypeMath } from '@/lib/math';
import { STALE_BADGE } from '@/lib/notebook-parse';
import { getHighlighter } from './highlight';
import { loadMath } from './render';

const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

/** The editor's grammars; anything else is plaintext. */
const highlight: Highlight = async (code, lang) => {
  const shiki = await getHighlighter();
  const name = lang && shiki.getLoadedLanguages().includes(lang) ? lang : 'text';
  const root = shiki.codeToHast(code, { lang: name, themes: THEMES, defaultColor: false });
  return (root.children.find((child) => child.type === 'element') as Element | undefined) ?? null;
};

const markdown = buildMarkdown(highlight, 0, true, 'parse');

// GitHub's schema, plus the ids, classes and styles headings and shiki need. Still no scripts or handlers.
const sanitizer = unified()
  .use(rehypeParse, { fragment: true })
  .use(rehypeSanitize, {
    ...defaultSchema,
    clobber: [],
    attributes: {
      ...defaultSchema.attributes,
      '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'style', 'ariaHidden'],
      a: [...(defaultSchema.attributes?.a ?? []), 'target', 'rel'],
      code: [['className', /^language-./, 'math-inline', 'math-display']],
    },
  })
  // After sanitizing, which drops SVG.
  .use(rehypeMath, { load: loadMath, fallback: mathErrorBox })
  .use(rehypeStringify)
  .freeze();

/** A local notebook's markdown cell, as the page would render it, minus Sphinx roles. */
export async function renderLocalProse(source: string): Promise<string> {
  const html = String(await markdown.process(source.replace(STALE_BADGE, '').trimStart()));
  return String(await sanitizer.process(html));
}
