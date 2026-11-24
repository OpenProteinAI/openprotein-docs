import type { BlockContext, Line, MarkdownConfig } from '@lezer/markdown';
import { Tag } from '@lezer/highlight';
import type { SyntaxNode } from '@lezer/common';
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, StateEffect, StateField, type EditorState } from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';

const DOLLAR = 36;

export const mathMarkTag = Tag.define();

/** A `$$` line's run length, or -1. */
function fence(line: Line): number {
  if (line.next !== DOLLAR || line.indent - line.baseIndent >= 4) return -1;
  let end = line.pos;
  while (line.text.charCodeAt(end) === DOLLAR) end += 1;
  const size = end - line.pos;
  // `$$ x $$` on one line is inline math.
  return size >= 2 && !line.text.slice(end).includes('$') ? size : -1;
}

/** remark-math's syntax. */
export const mathSyntax: MarkdownConfig = {
  defineNodes: [{ name: 'InlineMath' }, { name: 'BlockMath', block: true }, { name: 'MathMark', style: mathMarkTag }],
  parseInline: [
    {
      name: 'InlineMath',
      before: 'InlineCode',
      parse(cx, next, pos) {
        if (next !== DOLLAR || (pos > cx.offset && cx.char(pos - 1) === DOLLAR)) return -1;
        let open = pos;
        while (open < cx.end && cx.char(open) === DOLLAR) open += 1;
        const size = open - pos;
        // As a code span: no escapes.
        for (let at = open; at < cx.end; at += 1) {
          if (cx.char(at) !== DOLLAR) continue;
          let close = at;
          while (close < cx.end && cx.char(close) === DOLLAR) close += 1;
          if (close - at === size) {
            return cx.addElement(
              cx.elt('InlineMath', pos, close, [cx.elt('MathMark', pos, open), cx.elt('MathMark', at, close)]),
            );
          }
          at = close - 1;
        }
        return -1;
      },
    },
  ],
  parseBlock: [
    {
      name: 'BlockMath',
      before: 'FencedCode',
      parse(cx: BlockContext, line: Line) {
        const size = fence(line);
        if (size < 0) return false;
        const from = cx.lineStart + line.pos;
        const marks = [cx.elt('MathMark', from, from + size)];
        while (cx.nextLine()) {
          let end = line.pos;
          while (line.text.charCodeAt(end) === DOLLAR) end += 1;
          marks.push(...line.markers);
          if (end - line.pos >= size && line.skipSpace(end) === line.text.length) {
            marks.push(cx.elt('MathMark', cx.lineStart + line.pos, cx.lineStart + end));
            cx.nextLine();
            break;
          }
        }
        cx.addElement(cx.elt('BlockMath', from, cx.prevLineEnd(), marks));
        return true;
      },
      endLeaf: (_cx, line) => fence(line) >= 0,
    },
  ],
};

export interface MathSpan {
  from: number;
  to: number;
  display: boolean;
}

function span(node: SyntaxNode): MathSpan {
  const marks = node.getChildren('MathMark');
  const open = marks[0];
  const close = marks.length > 1 ? marks[marks.length - 1] : null;
  return { from: open?.to ?? node.from, to: close?.from ?? node.to, display: node.name === 'BlockMath' };
}

export function mathAt(state: EditorState, pos: number): MathSpan | null {
  const tree = ensureSyntaxTree(state, pos, 100) ?? syntaxTree(state);
  for (let node: SyntaxNode | null = tree.resolveInner(pos, -1); node; node = node.parent) {
    if (node.name !== 'InlineMath' && node.name !== 'BlockMath') continue;
    const inside = span(node);
    return pos >= inside.from && pos <= inside.to ? inside : null;
  }
  return null;
}

const command = Decoration.mark({ class: 'cm-tex-command' });
const punctuation = Decoration.mark({ class: 'cm-tex-punct' });
const TOKEN = /\\(?:[A-Za-z]+|.)|[{}_^&]/g;

function texTokens(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        if (node.name !== 'InlineMath' && node.name !== 'BlockMath') return;
        const inside = span(node.node);
        const text = view.state.sliceDoc(inside.from, inside.to);
        for (const match of text.matchAll(TOKEN)) {
          const at = inside.from + match.index;
          builder.add(at, at + match[0].length, /^\\[A-Za-z]/.test(match[0]) ? command : punctuation);
        }
        return false;
      },
    });
  }
  return builder.finish();
}

export const texHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = texTokens(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || syntaxTree(update.startState) !== syntaxTree(update.state)) {
        this.decorations = texTokens(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

export interface MathMark {
  from: number;
  to: number;
  message: string;
}

/** Dropped once `doc` is stale. */
export const setMathErrors = StateEffect.define<{ doc: string; errors: MathMark[] }>();

export const mathErrors = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    let next = value.map(transaction.changes);
    for (const effect of transaction.effects) {
      if (!effect.is(setMathErrors) || effect.value.doc !== transaction.state.doc.toString()) continue;
      next = Decoration.set(
        effect.value.errors
          .filter(({ from, to }) => from < to && to <= transaction.state.doc.length)
          .map(({ from, to, message }) =>
            Decoration.mark({ class: 'cm-tex-error', attributes: { title: message } }).range(from, to),
          ),
        true,
      );
    }
    return next;
  },
  provide: (field) => EditorView.decorations.from(field),
});
