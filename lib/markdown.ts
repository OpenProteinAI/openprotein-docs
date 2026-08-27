import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import {
  bundledLanguages,
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
} from 'shiki';

// Notebook cells and docstrings are full of bare '{' and '<', so they render as HTML, not MDX.

type AnyNode = { type: string; children?: AnyNode[] } & Record<string, unknown>;

/** Borrowed off shiki rather than 'hast', which is not a direct dependency. */
type HastElement = Extract<
  ReturnType<Highlighter['codeToHast']>['children'][number],
  { type: 'element' }
>;

const STATIC_PATH = /(\.{1,2}\/)+_static\//g;
const PATH_PROPS = ['src', 'href'] as const;

/** fumadocs-core's own pair, so .dark drives both via --shiki-light/--shiki-dark. */
const THEMES = { light: 'github-light', dark: 'github-dark' } as const;

function walk(node: unknown, visit: (node: AnyNode) => void): void {
  if (!node || typeof node !== 'object') return;
  const current = node as AnyNode;
  visit(current);
  for (const child of current.children ?? []) walk(child, visit);
}

function collect(tree: unknown, type: string): AnyNode[] {
  const found: AnyNode[] = [];
  walk(tree, (node) => {
    if (node.type === type) found.push(node);
  });
  return found;
}

/** On mdast, so rehype-slug still derives ids from heading text rather than the shifted rank. */
function shiftHeadings(tree: unknown, by: number): void {
  if (by === 0) return;
  walk(tree, (node) => {
    if (node.type !== 'heading') return;
    const depth = typeof node.depth === 'number' ? node.depth : 1;
    node.depth = Math.min(6, Math.max(1, depth + by));
  });
}

/** Raw nodes too: without rehype-raw a committed <img src="../_static/…"> stays raw. */
const EXTERNAL = /^(?:https?:)?\/\//i;

/** Notebook prose bypasses fumadocs' Link, which sets these itself. */
function externalLinks(tree: unknown): void {
  walk(tree, (node) => {
    if (node.type === 'raw' && typeof node.value === 'string') {
      node.value = node.value.replace(
        /<a\s([^>]*href=["'](?:https?:)?\/\/[^>]*)>/gi,
        (tag: string, attrs: string) =>
          /target=/i.test(attrs) ? tag : `<a ${attrs} target="_blank" rel="noopener noreferrer">`,
      );
      return;
    }
    if (node.type !== 'element' || node.tagName !== 'a') return;
    const props = node.properties as Record<string, unknown> | undefined;
    if (!props || typeof props.href !== 'string' || !EXTERNAL.test(props.href)) return;
    props.target = '_blank';
    props.rel = 'noopener noreferrer';
  });
}

function rewriteStaticPaths(tree: unknown): void {
  walk(tree, (node) => {
    if (node.type === 'raw') {
      if (typeof node.value === 'string') node.value = node.value.replace(STATIC_PATH, '/_static/');
      return;
    }
    if (node.type !== 'element' || !node.properties) return;
    const props = node.properties as Record<string, unknown>;
    for (const prop of PATH_PROPS) {
      const value = props[prop];
      if (typeof value === 'string') props[prop] = value.replace(STATIC_PATH, '/_static/');
    }
  });
}

function isBundled(lang: string): lang is BundledLanguage {
  return lang in bundledLanguages;
}

/** Unlabelled and unknown fences fall back to plaintext so every code block gets the same chrome. */
function langOf(node: AnyNode): BundledLanguage | 'text' {
  const lang = typeof node.lang === 'string' ? node.lang.trim().toLowerCase() : '';
  return isBundled(lang) ? lang : 'text';
}

let highlighting: Promise<Highlighter> | undefined;

/** One highlighter per process: loading grammars per request would dominate render time. */
function getHighlighter(): Promise<Highlighter> {
  highlighting ??= createHighlighter({ themes: [THEMES.light, THEMES.dark], langs: ['python'] });
  return highlighting;
}

const highlighted = new WeakMap<AnyNode, HastElement>();

async function highlightCode(tree: unknown): Promise<void> {
  const blocks = collect(tree, 'code');
  if (blocks.length === 0) return;

  const shiki = await getHighlighter();
  const loaded = new Set(shiki.getLoadedLanguages());
  const missing = new Set(
    blocks
      .map(langOf)
      .filter((lang): lang is BundledLanguage => lang !== 'text' && !loaded.has(lang)),
  );
  if (missing.size > 0) await shiki.loadLanguage(...missing);

  for (const block of blocks) {
    const value = typeof block.value === 'string' ? block.value : '';
    const root = shiki.codeToHast(value, {
      lang: langOf(block),
      themes: THEMES,
      defaultColor: false,
    });
    const pre = root.children.find((child): child is HastElement => child.type === 'element');
    if (pre) highlighted.set(block, pre);
  }
}

/** data.hName would land on the inner <code>, leaving shiki's <pre> nested in a second one. */
function codeHandler(_state: unknown, node: AnyNode): HastElement {
  const pre = highlighted.get(node);
  if (pre) return pre;

  const value = typeof node.value === 'string' ? node.value : '';
  return {
    type: 'element',
    tagName: 'pre',
    properties: {},
    children: [
      { type: 'element', tagName: 'code', properties: {}, children: [{ type: 'text', value }] },
    ],
  };
}

/**
 * Also answer to nbsphinx's anchor (`#Step-1.1:-Specify-the-target`), since fragments never
 * reach the server and no redirect can bridge it. An empty span as the heading's first child, so
 * the browser scrolls to the heading; first occurrence only, or two elements share an id.
 */
function nbsphinxAliases(tree: unknown): void {
  const seen = new Set<string>();
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node.children)) {
      for (const child of node.children) visit(child);
    }
    if (node.type !== 'element' || !/^h[1-6]$/.test(node.tagName)) return;
    const slug = node.properties?.id;
    if (typeof slug !== 'string' || !slug) return;
    const text = textOf(node).trim();
    const alias = text.replace(/\s+/g, '-');
    if (!alias || alias === slug || seen.has(alias)) return;
    seen.add(alias);
    node.children.unshift({
      type: 'element',
      tagName: 'span',
      properties: { id: alias, 'aria-hidden': 'true' },
      children: [],
    });
  };
  visit(tree);
}

function textOf(node: any): string {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') return typeof node.value === 'string' ? node.value : '';
  if (!Array.isArray(node.children)) return '';
  return node.children.map(textOf).join('');
}

function build(headingShift: number, nbAliases: boolean) {
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(function () {
      return (tree) => {
        shiftHeadings(tree, headingShift);
      };
    })
    .use(function () {
      return async (tree) => {
        await highlightCode(tree);
      };
    })
    // Pandas tables must survive; notebooks are first-party, so untrusted input needs sanitising.
    .use(remarkRehype, { allowDangerousHtml: true, handlers: { code: codeHandler } })
    .use(function () {
      return (tree) => {
        rewriteStaticPaths(tree);
        externalLinks(tree);
      };
    })
    .use(rehypeSlug)
    .use(function () {
      return (tree) => {
        if (nbAliases) nbsphinxAliases(tree);
      };
    })
    .use(rehypeStringify, { allowDangerousHtml: true })
    .freeze();
}

/** Assembling a pipeline is not free and notebook pages render one per request. */
const processors = new Map<string, ReturnType<typeof build>>();

export async function renderMarkdown(
  source: string,
  options?: {
    headingShift?: number;
    /** Also emit the id nbsphinx used, so old notebook deep links still land. Notebook cells
     *  only — a Python docstring never had an nbsphinx anchor. */
    nbsphinxAliases?: boolean;
  },
): Promise<string> {
  const headingShift = options?.headingShift ?? 0;
  const nbAliases = options?.nbsphinxAliases ?? false;
  const key = `${headingShift}:${nbAliases}`;
  let processor = processors.get(key);
  if (!processor) {
    processor = build(headingShift, nbAliases);
    processors.set(key, processor);
  }
  return String(await processor.process(source));
}
