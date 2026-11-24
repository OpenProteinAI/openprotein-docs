import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkGfm from 'remark-gfm';
import remarkStringify, { type Options as StringifyOptions } from 'remark-stringify';
import { splitDoc } from './doc';

interface Node {
  type: string;
  children?: Node[];
  position?: { start: { offset?: number }; end: { offset?: number } };
}

function jsxBlock(node: Node): boolean {
  return node.type === 'mdxJsxFlowElement';
}

interface TextState {
  safe: (value: string, info: unknown) => string;
}

/** remark escapes conservatively; undo the escapes that change nothing. */
function text(node: { value: string }, _parent: unknown, state: TextState, info: unknown): string {
  let out = state.safe(node.value, info);
  // Intraword underscores never start emphasis.
  out = out.replace(/(?<=\w)\\_(?=\w)/g, '_');
  // A lone tilde can't pair into strikethrough.
  if ((node.value.match(/~/g) ?? []).length === 1) out = out.replace('\\~', '~');
  // Brackets that can't open a link, e.g. a heading's [#id].
  out = out.replace(/\\\[(?=[^\]\n]*\](?![([:]))/g, '[');
  return out;
}

const processor = unified()
  .use(remarkParse)
  .use(remarkMdx, { quoteSmart: true })
  .use(remarkGfm, { tablePipeAlign: false })
  .use(remarkStringify, {
    // MARKDOWN.md's house style.
    bullet: '-',
    emphasis: '*',
    strong: '*',
    fence: '`',
    rule: '-',
    listItemIndent: 'one',
    incrementListMarker: true,
    handlers: { text },
  } as unknown as StringifyOptions);

const reparse = unified().use(remarkParse).use(remarkMdx).use(remarkGfm);

/** JSX children on consecutive lines, as in <Cards>; mdx-jsx always puts a blank line between. */
function tightenJsxSiblings(markdown: string): string {
  const cuts: { from: number; to: number; indent: string }[] = [];
  const walk = (node: Node) => {
    const children = node.children ?? [];
    children.forEach((child, index) => {
      walk(child);
      const next = children[index + 1];
      if (!jsxBlock(node) || !next || !jsxBlock(child) || !jsxBlock(next)) return;
      const from = child.position?.end.offset;
      const to = next.position?.start.offset;
      if (from === undefined || to === undefined) return;
      const gap = /^\n[ \t]*\n([ \t]*)$/.exec(markdown.slice(from, to));
      if (gap) cuts.push({ from, to, indent: gap[1] });
    });
  };
  walk(reparse.parse(markdown) as Node);
  let out = markdown;
  for (const cut of cuts.sort((a, b) => b.from - a.from)) out = out.slice(0, cut.from) + `\n${cut.indent}` + out.slice(cut.to);
  return out;
}

/** `| - |` back to the docs' `| --- |`, outside code fences. */
function widenTableRules(markdown: string): string {
  let fence: string | null = null;
  return markdown
    .split('\n')
    .map((line) => {
      const marker = /^\s*(```|~~~)/.exec(line)?.[1];
      if (marker) fence = fence === marker ? null : (fence ?? marker);
      if (fence || !/^\s*\|(\s*:?-+:?\s*\|)+\s*$/.test(line)) return line;
      return line.replace(/(:?)-+(:?)/g, (_, left: string, right: string) => `${left}---${right}`);
    })
    .join('\n');
}

export class FormatError extends Error {
  constructor(
    message: string,
    readonly line?: number,
  ) {
    super(message);
  }
}

/** Formats the MDX body in the docs' style; the frontmatter is left as written. */
export function formatMdx(source: string): string {
  const { body, bodyLine } = splitDoc(source);
  const head = source.slice(0, source.length - body.length);
  let out: string;
  try {
    out = tightenJsxSiblings(widenTableRules(String(processor.processSync(body)))).trim();
  } catch (error) {
    const line = (error as { line?: number }).line;
    const reason = (error as { reason?: string }).reason ?? (error instanceof Error ? error.message : String(error));
    throw new FormatError(reason, line ? line + bodyLine - 1 : undefined);
  }
  if (!out) return head;
  return head ? `${head}\n${out}\n` : `${out}\n`;
}
