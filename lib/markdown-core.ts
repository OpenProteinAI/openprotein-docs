import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import type { Element } from 'hast';
import { rehypeMath, remarkMath, type RehypeMathOptions } from './math';

// Notebook cells and docstrings are full of bare '{' and '<', so they render as HTML, not MDX.
// No shiki here: the server and the editor's preview each pass in a highlighter.

type AnyNode = { type: string; children?: AnyNode[] } & Record<string, unknown>;

const STATIC_PATH = /(\.{1,2}\/)+_static\//g;
const PATH_PROPS = ['src', 'href'] as const;

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

/** data.hName would land on the inner <code>, leaving shiki's <pre> nested in a second one. */
function codeHandler(highlighted: WeakMap<AnyNode, Element>) {
  return (_state: unknown, node: AnyNode): Element => {
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

/** Shiki's <pre> for a fenced block, or null to leave it plain. */
export type Highlight = (code: string, lang: string) => Promise<Element | null>;

/** A fence's language, lowercased; empty when unlabelled. */
function langOf(node: AnyNode): string {
  return typeof node.lang === 'string' ? node.lang.trim().toLowerCase() : '';
}

/** Jupyter shows inline `$$x$$` as display math. */
function displayDollars(tree: unknown, source: string): void {
  walk(tree, (node) => {
    const offset = (node.position as { start?: { offset?: number } } | undefined)?.start?.offset;
    if (node.type !== 'inlineMath' || offset === undefined || !source.startsWith('$$', offset)) return;
    node.data = { ...(node.data as object), hProperties: { className: ['language-math', 'math-display'] } };
  });
}

/** `parse`: TeX left for a later pass. */
export type MarkdownMath = 'parse' | RehypeMathOptions;

/** The markdown pipeline; the server and the editor bring their own highlighter. */
export function buildMarkdown(highlight: Highlight, headingShift: number, nbAliases: boolean, math?: MarkdownMath) {
  const highlighted = new WeakMap<AnyNode, Element>();
  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(math ? [remarkMath] : [])
    .use(function () {
      return (tree, file) => {
        if (math) displayDollars(tree, String(file.value));
      };
    })
    .use(function () {
      return (tree) => {
        shiftHeadings(tree, headingShift);
      };
    })
    .use(function () {
      return async (tree) => {
        for (const block of collect(tree, 'code')) {
          const pre = await highlight(typeof block.value === 'string' ? block.value : '', langOf(block));
          if (pre) highlighted.set(block, pre);
        }
      };
    })
    // Pandas tables must survive; notebooks are first-party, so untrusted input needs sanitising.
    .use(remarkRehype, { allowDangerousHtml: true, handlers: { code: codeHandler(highlighted) } })
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
    // Ids from TeX, as in MDX.
    .use(math && math !== 'parse' ? [[rehypeMath, math]] : [])
    .use(rehypeStringify, { allowDangerousHtml: true })
    .freeze();
}
