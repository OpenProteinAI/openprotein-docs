'use client';

import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { EditorSelection, EditorState } from '@codemirror/state';
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { selectNextOccurrence } from '@codemirror/search';
import { markdown } from '@codemirror/lang-markdown';
import { yamlFrontmatter } from '@codemirror/lang-yaml';
import { tags as t } from '@lezer/highlight';
import { splitDoc } from '@/lib/editor/doc';
import { mathAt, mathErrors, mathMarkTag, mathSyntax, setMathErrors, texHighlight, type MathMark } from '@/lib/editor/math-syntax';
import { expandMath, type MathSnippet } from '@/lib/editor/snippets';

export interface SourceEditorHandle {
  /** Wraps the selection, or a placeholder selected for typing over. */
  wrap(before: string, after: string, placeholder: string): void;
  /** Prefixes each selected line; strips first so a heading level swaps. */
  prefixLines(prefix: (index: number) => string, strip?: RegExp): void;
  /** Inserts a block on its own lines at the cursor; `wrap` builds it around a selection instead. */
  insertBlock(text: string, wrap?: (content: string) => string): void;
  /** TeX at the cursor, else in a new equation. */
  insertMath(snippet: MathSnippet): void;
  /** Ignored once `doc` has changed. */
  markMathErrors(doc: string, errors: MathMark[]): void;
  /** Fractional source line `offset` px below the viewport top. */
  lineAt(offset: number): number;
  /** Scrolls `line` to `offset` px below the viewport top. */
  scrollToLine(line: number, offset: number): void;
  isAtEnd(): boolean;
  scroller(): HTMLElement | null;
}

const theme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'var(--op-panel-bg)', color: 'var(--color-fd-foreground)' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', lineHeight: '1.7' },
  '.cm-content': { padding: '0.75rem 0 40vh', caretColor: 'var(--color-fd-primary)' },
  '.cm-gutters': {
    backgroundColor: 'var(--op-panel-bg)',
    color: 'var(--color-fd-muted-foreground)',
    border: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 0.75rem 0 1rem' },
  '.cm-activeLine, .cm-activeLineGutter': {
    backgroundColor: 'color-mix(in srgb, var(--color-fd-foreground) 5%, transparent)',
  },
  '.cm-activeLineGutter': { color: 'var(--color-fd-foreground)' },
  '.cm-cursor': { borderLeftColor: 'var(--color-fd-primary)', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
    backgroundColor: 'color-mix(in srgb, var(--color-fd-primary) 22%, transparent) !important',
  },
  '.cm-tex-command': { color: 'var(--brand-1-ink)' },
  '.cm-tex-punct': { color: 'var(--color-fd-muted-foreground)' },
  '.cm-tex-error': {
    textDecoration: 'underline wavy var(--color-fd-error)',
    textDecorationSkipInk: 'none',
    textUnderlineOffset: '0.1875rem',
  },
});

// Object Sans-safe weights only: 500, never 600/700.
const highlight = HighlightStyle.define([
  { tag: t.heading, fontWeight: '500', color: 'var(--color-fd-foreground)' },
  { tag: t.strong, fontWeight: '500' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: [t.link, t.url], color: 'var(--brand-1-ink)' },
  { tag: t.monospace, color: 'var(--brand-3-ink)' },
  { tag: [t.processingInstruction, t.meta, t.contentSeparator], color: 'var(--color-fd-muted-foreground)' },
  { tag: t.quote, color: 'var(--color-fd-muted-foreground)' },
  { tag: [t.tagName, t.angleBracket], color: 'var(--brand-1-ink)' },
  { tag: [t.attributeName, t.propertyName], color: 'var(--brand-2-ink)' },
  { tag: [t.string, t.attributeValue], color: 'var(--brand-3-ink)' },
  { tag: [t.keyword, t.bool, t.number], color: 'var(--brand-2-ink)' },
  { tag: t.comment, color: 'var(--color-fd-muted-foreground)', fontStyle: 'italic' },
  { tag: mathMarkTag, color: 'var(--brand-2-ink)' },
]);

function wrapSelection(editor: EditorView, before: string, after: string, placeholder: string): boolean {
  editor.dispatch(
    editor.state.changeByRange((range) => {
      const text = editor.state.sliceDoc(range.from, range.to) || placeholder;
      const start = range.from + before.length;
      return {
        changes: { from: range.from, to: range.to, insert: `${before}${text}${after}` },
        range: EditorSelection.range(start, start + text.length),
      };
    }),
  );
  return true;
}

/** Smallest edit turning `from` into `to`, so the cursor survives an outside change. */
function diff(from: string, to: string) {
  let start = 0;
  while (start < from.length && start < to.length && from[start] === to[start]) start += 1;
  let endFrom = from.length;
  let endTo = to.length;
  while (endFrom > start && endTo > start && from[endFrom - 1] === to[endTo - 1]) {
    endFrom -= 1;
    endTo -= 1;
  }
  return { from: start, to: endFrom, insert: to.slice(start, endTo) };
}

interface Built {
  text: string;
  select?: [number, number];
}

/** A block on its own lines, around the selection or below the cursor. */
function placeBlock(editor: EditorView, build: (content: string | null) => Built, canWrap: boolean) {
  const { state } = editor;
  const { bodyLine, yaml } = splitDoc(state.doc.toString());
  const inBody = (pos: number) => yaml === null || state.doc.lineAt(pos).number >= bodyLine;
  const { from, to } = state.selection.main;
  const selected = state.sliceDoc(from, to);
  const put = (start: number, end: number, before: string, { text, select }: Built, after: string) => {
    const at = start + before.length;
    editor.dispatch({
      changes: { from: start, to: end, insert: `${before}${text}${after}` },
      selection: select ? { anchor: at + select[0], head: at + select[1] } : { anchor: at + text.length + after.length },
      scrollIntoView: true,
    });
    editor.focus();
  };
  if (canWrap && selected.trim() && inBody(from)) {
    // Blank-line edges stay outside the block.
    let start = from + /^(?:[ \t]*\n)*/.exec(selected)![0].length;
    let end = to - /(?:\n[ \t]*)*$/.exec(selected)![0].length;
    const first = state.doc.lineAt(start);
    const last = state.doc.lineAt(end);
    // Mid-line edges split the paragraph; otherwise take whole lines.
    const splitBefore = Boolean(state.sliceDoc(first.from, start).trim());
    const splitAfter = Boolean(state.sliceDoc(end, last.to).trim());
    if (!splitBefore) start = first.from;
    if (!splitAfter) end = last.to;
    const content = state.sliceDoc(start, end).trimEnd();
    // The split paragraph keeps no dangling spaces.
    if (splitBefore) start -= /[ \t]*$/.exec(state.sliceDoc(first.from, start))![0].length;
    if (splitAfter) end += /^[ \t]*/.exec(state.sliceDoc(end, last.to))![0].length;
    const above = splitBefore ? '\n\n' : first.number > 1 && state.doc.line(first.number - 1).text.trim() ? '\n' : '';
    const below = splitAfter ? '\n\n' : last.number < state.doc.lines && state.doc.line(last.number + 1).text.trim() ? '\n' : '';
    const built = build(content);
    const text = built.text.replace(/\n$/, '');
    // Cursor after the block.
    put(start, end, above, { text, select: built.select ?? [text.length, text.length] }, below);
    return;
  }
  // Never inside the frontmatter: below it instead.
  let line = state.doc.lineAt(state.selection.main.head);
  if (!inBody(line.from)) line = state.doc.line(Math.min(bodyLine, state.doc.lines));
  const at = line.text.trim() ? line.to : line.from;
  const before = line.text.trim() ? '\n\n' : at > 0 && state.doc.lineAt(at - 1).text.trim() ? '\n' : '';
  const built = build(null);
  put(at, at, before, built, built.text.endsWith('\n') ? '' : '\n');
}

export function SourceEditor({
  value,
  onChange,
  onCursor,
  onScroll,
  onFormat,
  onMath,
  ref,
}: {
  value: string;
  onChange: (value: string) => void;
  onCursor: (line: number) => void;
  onScroll: () => void;
  onFormat?: () => void;
  onMath?: (inside: boolean) => void;
  ref?: Ref<SourceEditorHandle>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onCursor, onScroll, onFormat, onMath });
  callbacks.current = { onChange, onCursor, onScroll, onFormat, onMath };

  useEffect(() => {
    const editor = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          highlightActiveLineGutter(),
          drawSelection(),
          EditorState.allowMultipleSelections.of(true),
          history(),
          keymap.of([
            { key: 'Mod-b', run: (editor) => wrapSelection(editor, '**', '**', 'bold text') },
            { key: 'Mod-i', run: (editor) => wrapSelection(editor, '*', '*', 'italic text') },
            { key: 'Mod-d', run: selectNextOccurrence, preventDefault: true },
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
          ]),
          yamlFrontmatter({ content: markdown({ extensions: [mathSyntax] }) }),
          syntaxHighlighting(highlight),
          texHighlight,
          mathErrors,
          EditorView.lineWrapping,
          // ⇧⌥F by physical key: on macOS the keymap sees "Ï".
          EditorView.domEventHandlers({
            keydown(event) {
              if (event.code !== 'KeyF' || !event.shiftKey || !event.altKey || event.metaKey || event.ctrlKey) return false;
              event.preventDefault();
              callbacks.current.onFormat?.();
              return true;
            },
          }),
          theme,
          EditorView.contentAttributes.of({ 'aria-label': 'MDX source' }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
            if (update.docChanged || update.selectionSet) {
              const { head } = update.state.selection.main;
              callbacks.current.onCursor(update.state.doc.lineAt(head).number);
              callbacks.current.onMath?.(mathAt(update.state, head) !== null);
            }
          }),
        ],
      }),
    });
    const scroll = () => callbacks.current.onScroll();
    editor.scrollDOM.addEventListener('scroll', scroll, { passive: true });
    view.current = editor;
    return () => {
      editor.scrollDOM.removeEventListener('scroll', scroll);
      editor.destroy();
      view.current = null;
    };
    // Seeds once; the next effect syncs later values.
  }, []);

  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current !== value) editor.dispatch({ changes: diff(current, value) });
  }, [value]);

  useImperativeHandle(
    ref,
    () => ({
      wrap(before, after, placeholder) {
        const editor = view.current;
        if (!editor) return;
        wrapSelection(editor, before, after, placeholder);
        editor.focus();
      },
      prefixLines(prefix, strip) {
        const editor = view.current;
        if (!editor) return;
        const { state } = editor;
        const first = state.doc.lineAt(state.selection.main.from).number;
        const last = state.doc.lineAt(state.selection.main.to).number;
        const specs = [];
        for (let n = first; n <= last; n += 1) {
          const line = state.doc.line(n);
          const old = strip?.exec(line.text);
          // Replace only the old marker.
          specs.push({ from: line.from, to: line.from + (old?.index === 0 ? old[0].length : 0), insert: prefix(n - first) });
        }
        const changes = state.changes(specs);
        // assoc 1: the cursor lands after the prefix.
        editor.dispatch({ changes, selection: state.selection.map(changes, 1) });
        editor.focus();
      },
      insertBlock(text, wrap) {
        const editor = view.current;
        if (editor) placeBlock(editor, (content) => ({ text: content !== null && wrap ? wrap(content) : text }), Boolean(wrap));
      },
      insertMath(snippet) {
        const editor = view.current;
        if (!editor) return;
        const { state } = editor;
        const { from, to } = state.selection.main;
        const selected = state.sliceDoc(from, to);
        const math = mathAt(state, from);
        if (math && to <= math.to) {
          const { text, select } = expandMath(snippet, selected, {
            before: state.sliceDoc(Math.max(0, from - 1), from),
            inline: !math.display,
          });
          // Not `\alphax`.
          const insert = /[A-Za-z]$/.test(text) && /^[A-Za-z]/.test(state.sliceDoc(to, to + 1)) ? `${text} ` : text;
          editor.dispatch({
            changes: { from, to, insert },
            selection: { anchor: from + select[0], head: from + select[1] },
            scrollIntoView: true,
          });
          editor.focus();
          return;
        }
        const { bodyLine, yaml } = splitDoc(state.doc.toString());
        const inBody = yaml === null || state.doc.lineAt(from).number >= bodyLine;
        if (snippet.display || !inBody) {
          const [open, close] = snippet.display ? ['$$\n', '\n$$'] : ['$', '$'];
          placeBlock(
            editor,
            (content) => {
              const { text, select, done } = expandMath(snippet, content ?? '', { inline: !snippet.display });
              return { text: `${open}${text}${close}`, select: done ? undefined : [select[0] + open.length, select[1] + open.length] };
            },
            true,
          );
          return;
        }
        const { text, select, done } = expandMath(snippet, selected, { inline: true });
        editor.dispatch({
          changes: { from, to, insert: `$${text}$` },
          selection: done ? { anchor: from + text.length + 2 } : { anchor: from + 1 + select[0], head: from + 1 + select[1] },
          scrollIntoView: true,
        });
        editor.focus();
      },
      markMathErrors(doc, errors) {
        view.current?.dispatch({ effects: setMathErrors.of({ doc, errors }) });
      },
      lineAt(offset) {
        const editor = view.current;
        if (!editor) return 1;
        const y = Math.max(0, editor.scrollDOM.scrollTop + offset - editor.documentPadding.top);
        const block = editor.lineBlockAtHeight(y);
        const fraction = block.height ? Math.min(1, Math.max(0, (y - block.top) / block.height)) : 0;
        return editor.state.doc.lineAt(block.from).number + fraction;
      },
      scrollToLine(line, offset) {
        const editor = view.current;
        if (!editor) return;
        const n = Math.min(Math.max(1, Math.floor(line)), editor.state.doc.lines);
        const block = editor.lineBlockAt(editor.state.doc.line(n).from);
        editor.scrollDOM.scrollTop = block.top + (line - n) * block.height + editor.documentPadding.top - offset;
      },
      isAtEnd() {
        const scroller = view.current?.scrollDOM;
        return Boolean(scroller && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2);
      },
      scroller: () => view.current?.scrollDOM ?? null,
    }),
    [],
  );

  return <div ref={host} className="h-full min-h-0 overflow-hidden" />;
}
