import type { ComponentType, ElementType, ReactNode } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import type { Element, ElementContent, Root } from 'hast';
import type { Root as MdastRoot } from 'mdast';
import type * as Es from 'estree-jsx';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkRehype, { type Options as RehypeOptions } from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import { remarkCodeTab } from 'fumadocs-core/mdx-plugins/remark-code-tab';
import { toJsxRuntime, type Components } from 'hast-util-to-jsx-runtime';
import { icons } from 'lucide-react';
import { Missing, PREVIEW_COMPONENTS } from '@/components/editor/preview-components';
import { errorRange, mathErrorBox, mathFailures, rehypeMath, remarkMath, type MathFailure, type TexToHast } from '@/lib/math';
import { rehypeCodePreview } from './highlight';

export interface Issue {
  message: string;
  line?: number;
}

/** `from`/`to`: document offsets to underline. */
export interface MathError {
  message: string;
  line: number;
  from: number;
  to: number;
}

export interface Rendered {
  content: ReactNode;
  issues: Issue[];
  mathErrors: MathError[];
}

/** A syntax error: the preview keeps its last good render. */
export class RenderError extends Error {
  constructor(message: string, readonly line?: number) {
    super(message);
  }
}

// Never pass these through: script, iframe, link, meta, style and form stay out.
const INTRINSIC = new Set(
  'a abbr b blockquote br caption cite code col colgroup dd del details dfn div dl dt em figcaption figure h1 h2 h3 h4 h5 h6 hr i img ins kbd li mark ol p picture pre q s samp section small source span strong sub summary sup table tbody td tfoot th thead time tr u ul var video wbr'.split(
    ' ',
  ),
);

function blockedProp(name: string): boolean {
  return /^on/i.test(name) || ['dangerouslySetInnerHTML', 'srcDoc', 'formAction', 'ref', '__proto__'].includes(name);
}

const MDX_NODES = ['mdxjsEsm', 'mdxFlowExpression', 'mdxTextExpression', 'mdxJsxFlowElement', 'mdxJsxTextElement'];

class Unsupported extends Error {}

const LUCIDE = icons as Record<string, ComponentType>;
const COMPONENTS: Record<string, unknown> = { ...LUCIDE, ...PREVIEW_COMPONENTS };

/** A component, an allowed tag, or a stand-in that says why not. */
function resolve(name: string): string | ComponentType<Record<string, unknown>> {
  if (/^[a-z]/.test(name)) return INTRINSIC.has(name) ? name : missing(name, 'is not allowed in docs.');
  const component = COMPONENTS[name];
  return (component as ComponentType<Record<string, unknown>>) ?? missing(name, 'is not a docs component.');
}

const stubCache = new Map<string, ComponentType>();

function missing(name: string, reason: string): ComponentType {
  const key = `${name}\0${reason}`;
  let component = stubCache.get(key);
  if (!component) {
    component = () => <Missing name={name} reason={reason} />;
    stubCache.set(key, component);
  }
  return component;
}

/** Literal values and JSX only: shared links must never run code. */
function evaluate(node: Es.Node): unknown {
  switch (node.type) {
    case 'Literal':
      if ('regex' in node && node.regex) throw new Unsupported('Regular expressions are not supported.');
      return node.value;
    case 'TemplateLiteral':
      if (node.expressions.length) throw new Unsupported('Template literals cannot interpolate.');
      return node.quasis.map((quasi) => quasi.value.cooked ?? '').join('');
    case 'ArrayExpression':
      return node.elements.map((item) => {
        if (!item || item.type === 'SpreadElement') throw new Unsupported('Array spreads are not supported.');
        return evaluate(item);
      });
    case 'ObjectExpression': {
      const out: Record<string, unknown> = {};
      for (const property of node.properties) {
        if (property.type !== 'Property' || property.computed || property.kind !== 'init' || property.method) {
          throw new Unsupported('Objects may hold plain key: value pairs only.');
        }
        const key =
          property.key.type === 'Identifier'
            ? property.key.name
            : property.key.type === 'Literal'
              ? String(property.key.value)
              : null;
        if (key === null || blockedProp(key)) throw new Unsupported(`The key \`${key}\` is not allowed.`);
        out[key] = evaluate(property.value);
      }
      return out;
    }
    case 'UnaryExpression': {
      const value = evaluate(node.argument);
      if (node.operator === '-' && typeof value === 'number') return -value;
      if (node.operator === '+' && typeof value === 'number') return value;
      if (node.operator === '!') return !value;
      throw new Unsupported(`The \`${node.operator}\` operator is not supported.`);
    }
    case 'Identifier':
      if (node.name === 'undefined') return undefined;
      // Component names reach here from toJsxRuntime.
      if (/^[A-Z]/.test(node.name)) return resolve(node.name);
      throw new Unsupported(`Variables like \`${node.name}\` are not supported.`);
    case 'JSXElement':
      return element(node);
    case 'JSXFragment':
      return node.children.length ? jsxs(Fragment, { children: children(node.children) }) : null;
    default:
      throw new Unsupported(`Only literal values and JSX are supported, not ${node.type}.`);
  }
}

function element(node: Es.JSXElement): ReactNode {
  const name = node.openingElement.name;
  if (name.type !== 'JSXIdentifier') throw new Unsupported('Dotted or namespaced names are not supported.');
  const props: Record<string, unknown> = {};
  for (const attribute of node.openingElement.attributes) {
    if (attribute.type === 'JSXSpreadAttribute') throw new Unsupported('Spread props are not supported.');
    if (attribute.name.type !== 'JSXIdentifier') throw new Unsupported('Namespaced props are not supported.');
    const key = attribute.name.name;
    if (blockedProp(key)) throw new Unsupported(`The \`${key}\` prop is not allowed.`);
    const value = attribute.value;
    props[key] =
      value === null || value === undefined
        ? true
        : value.type === 'JSXExpressionContainer'
          ? value.expression.type === 'JSXEmptyExpression'
            ? undefined
            : evaluate(value.expression)
          : evaluate(value);
  }
  const kids = children(node.children);
  if (kids.length === 1) props.children = kids[0];
  else if (kids.length > 1) props.children = kids;
  return (kids.length > 1 ? jsxs : jsx)(resolve(name.name) as ElementType, props);
}

/** JSX's whitespace rules for text children. */
function jsxText(value: string): string {
  const lines = value.split(/\r\n|\n|\r/);
  return lines
    .map((line, index) => {
      let out = line.replace(/\t/g, ' ');
      if (index > 0) out = out.replace(/^[ ]+/, '');
      if (index < lines.length - 1) out = out.replace(/[ ]+$/, '');
      return out;
    })
    .filter((line, index) => line || index === 0 || index === lines.length - 1)
    .join(' ')
    .replace(/^ +$/, '');
}

function children(nodes: Es.JSXElement['children']): ReactNode[] {
  const out: ReactNode[] = [];
  for (const child of nodes) {
    if (child.type === 'JSXText') {
      const text = jsxText(child.value);
      if (text) out.push(text);
    } else if (child.type === 'JSXExpressionContainer') {
      if (child.expression.type !== 'JSXEmptyExpression') out.push(evaluate(child.expression) as ReactNode);
    } else if (child.type === 'JSXSpreadChild') {
      throw new Unsupported('Spread children are not supported.');
    } else {
      out.push(evaluate(child) as ReactNode);
    }
  }
  return out;
}

interface Estree {
  data?: { estree?: Es.Program | null };
}

interface MdxAttribute extends Estree {
  type: 'mdxJsxAttribute' | 'mdxJsxExpressionAttribute';
  name?: string;
  value?: string | null | (Estree & { type: 'mdxJsxAttributeValueExpression' });
}

function expressionOf(program: Es.Program | null | undefined): Es.Expression | null {
  const statement = program?.body[0];
  return statement?.type === 'ExpressionStatement' ? statement.expression : null;
}

/** Throws Unsupported for anything evaluate() would refuse. */
function check(program: Es.Program | null | undefined): void {
  const expression = expressionOf(program);
  if (expression) evaluate(expression);
}

interface Loose extends Estree {
  type: string;
  name?: string | null;
  attributes?: MdxAttribute[];
  children?: Loose[];
  position?: Element['position'];
}

/** Drop or stub what the preview refuses, noting each with its line. */
function sanitize(parent: { children?: Loose[] }, issues: Issue[], lineOffset: number): void {
  const list = parent.children ?? [];
  for (let index = 0; index < list.length; index += 1) {
    const node = list[index];
    const line = node.position ? node.position.start.line + lineOffset : undefined;
    const report = (error: unknown) =>
      issues.push({ message: error instanceof Error ? error.message : String(error), line });
    const drop = () => {
      list.splice(index, 1);
      index -= 1;
    };

    if (node.type === 'mdxjsEsm') {
      drop();
      continue;
    }
    if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') {
      try {
        check(node.data?.estree);
      } catch (error) {
        report(error);
        drop();
      }
      continue;
    }
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      node.attributes = (node.attributes ?? []).filter((attribute) => {
        try {
          if (attribute.type === 'mdxJsxExpressionAttribute') throw new Unsupported('Spread props are not supported.');
          if (!attribute.name || blockedProp(attribute.name)) {
            throw new Unsupported(`The \`${attribute.name}\` prop is not allowed.`);
          }
          if (attribute.value && typeof attribute.value === 'object') check(attribute.value.data?.estree);
          return true;
        } catch (error) {
          report(error);
          return false;
        }
      });
      if (node.name) {
        const resolved = resolve(node.name);
        const known = typeof resolved === 'string' || resolved === COMPONENTS[node.name];
        if (!known) {
          node.attributes = [];
          node.children = [];
          node.name = stub(resolved);
        }
      }
    }
    if (node.children) sanitize(node, issues, lineOffset);
  }
}

let stubCount = 0;
const stubNames = new Map<ComponentType<Record<string, unknown>>, string>();

/** Registers a stand-in under a name toJsxRuntime can look up. */
function stub(component: ComponentType<Record<string, unknown>>): string {
  let name = stubNames.get(component);
  if (!name) {
    name = `OpStub${stubCount++}`;
    stubNames.set(component, name);
    COMPONENTS[name] = component;
  }
  return name;
}

/** Each top-level block in a box-less wrapper that records its source lines. */
function markBlocks(tree: Root, lineOffset: number): void {
  tree.children = tree.children.map((child) => {
    const position = (child as { position?: Element['position'] }).position;
    if (!position || child.type === 'text' || child.type === 'comment') return child;
    return {
      type: 'element',
      tagName: 'div',
      properties: {
        dataBlock: '',
        dataStart: position.start.line + lineOffset,
        dataEnd: position.end.line + lineOffset,
        style: 'display:contents',
      },
      children: [child as ElementContent],
    } satisfies Element;
  });
}

/** ~480 KB gzipped, so on demand. */
export const loadMath = (): Promise<TexToHast> => import('@/lib/mathjax').then((module) => module.texToHast);

const parser = unified().use(remarkParse).use(remarkMdx).use(remarkGfm).use(remarkMath);
const transformer = unified()
  .use(remarkCodeTab)
  .use(remarkRehype, { passThrough: MDX_NODES } as RehypeOptions)
  .use(rehypeSlug)
  // Before shiki.
  .use(rehypeMath, { load: loadMath, fallback: mathErrorBox })
  .use(rehypeCodePreview);

const evaluater = {
  evaluateExpression: (expression: Es.Expression) => evaluate(expression),
  evaluateProgram: () => undefined,
};

/** MDX body to React, without running any of its code; `blocks: false` skips the line markers. */
export async function renderMdx(
  body: string,
  lineOffset = 0,
  {
    blocks = true,
    /** The body's start in the document. */
    offset = 0,
  } = {},
): Promise<Rendered> {
  let mdast: MdastRoot;
  try {
    mdast = parser.parse(body);
  } catch (error) {
    const line = (error as { line?: number }).line;
    throw new RenderError(
      (error as { reason?: string }).reason ?? (error instanceof Error ? error.message : String(error)),
      line ? line + lineOffset : undefined,
    );
  }

  // The callback form returns the file.
  const { tree, failures } = await new Promise<{ tree: Root; failures: MathFailure[] }>((resolve, reject) =>
    transformer.run(mdast, (error, tree, file) => {
      if (error || !tree || !file) reject(error);
      else resolve({ tree: tree as Root, failures: mathFailures(file) });
      return undefined;
    }),
  );
  const mathErrors = failures.map(({ message, position }): MathError => {
    const start = position?.start.offset ?? 0;
    const [from, to] = errorRange(body.slice(start, position?.end.offset ?? start), message);
    const line = (position?.start.line ?? 1) + body.slice(start, start + from).split('\n').length - 1;
    return { message, line: line + lineOffset, from: offset + start + from, to: offset + start + to };
  });
  const issues: Issue[] = [];
  sanitize(tree as unknown as { children: Loose[] }, issues, lineOffset);
  if (blocks) markBlocks(tree, lineOffset);

  try {
    const content = toJsxRuntime(tree, {
      Fragment,
      jsx,
      jsxs,
      components: COMPONENTS as Partial<Components>,
      createEvaluater: () => evaluater,
      elementAttributeNameCase: 'react',
      stylePropertyNameCase: 'dom',
      ignoreInvalidStyle: true,
      passKeys: true,
    });
    return { content, issues, mathErrors };
  } catch (error) {
    throw new RenderError(error instanceof Error ? error.message : String(error));
  }
}
