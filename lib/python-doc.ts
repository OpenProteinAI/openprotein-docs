import 'server-only';

import { renderMarkdown } from './markdown';

/**
 * Docstring prose is RST, not markdown. Rather than pull in a second renderer, it goes
 * through the markdown pipeline after a normalising pass that covers the four constructs
 * this SDK's 492 docstrings actually use: cross-reference roles, double-backtick literals,
 * `.. code-block::` directives and bare doctest blocks.
 *
 * The pass is line-based and fence-aware. Anything inside a fenced block is left completely
 * alone — an earlier version applied the inline rules globally and its double-backtick rule
 * ate the ``` fences it had just written, turning every example into a paragraph.
 */

/** `:py:class:`~openprotein.fold.FoldAPI`` and friends. The generator resolves the ones it
 *  can link; whatever reaches here is a leftover and becomes a code span. */
const ROLE = /:(?:py:)?(class|meth|func|attr|obj|mod|exc|data)::?`([^`]+)`/g;

/** RST literal `` ``x`` `` is markdown `` `x` ``. Guarded so it cannot match a ``` fence. */
const DOUBLE_BACKTICK = /(?<!`)``(?!`)([^`]+?)``(?!`)/g;

/** `.. note::` / `.. warning::` blocks napoleon did not already lift into a section. */
const DIRECTIVE = /^\s*\.\.\s+(note|warning|tip|important|caution|seealso)::\s*$/i;

const CODE_BLOCK = /^(\s*)\.\.\s+code-block::\s*(\S*)\s*$/;
const DIRECTIVE_OPTION = /^\s+:[\w-]+:/;
const FENCE = /^\s*```/;
const DOCTEST = /^(\s*)>>>\s?(.*)$/;
const CONTINUATION = /^(\s*)\.\.\.\s?(.*)$/;

/** ipython3 is not a shiki language; the content is plain Python. */
const LANGUAGE: Record<string, string> = { ipython3: 'python', ipython: 'python', pycon: 'python' };

function role(_match: string, _kind: string, target: string): string {
  const short = target.startsWith('~');
  const dotted = short ? target.slice(1) : target;
  const label = short ? (dotted.split('.').pop() ?? dotted) : dotted;
  return `\`${label}\``;
}

function inline(line: string): string {
  if (DIRECTIVE.test(line)) {
    const kind = DIRECTIVE.exec(line)![1];
    return `**${kind[0].toUpperCase()}${kind.slice(1)}:**`;
  }
  return line
    .replace(ROLE, role)
    .replace(DOUBLE_BACKTICK, (_m, inner: string) => `\`${inner}\``);
}

/**
 * `.. code-block:: python` plus its indented body, as a fenced block. 16 of these survive in
 * the SDK's docstrings (4 `python`, 12 `ipython3`). Without it they render as a stray
 * paragraph followed by an indented blob — a 4-space indent only reads as code in markdown
 * when it is not continuing a paragraph, which here it is.
 */
function fenceCodeBlocks(lines: string[]): string[] {
  const out: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const match = CODE_BLOCK.exec(lines[i]);
    if (!match) {
      out.push(lines[i]);
      continue;
    }

    const indent = match[1].length;
    const language = LANGUAGE[match[2]] ?? match[2] ?? '';

    let cursor = i + 1;
    while (cursor < lines.length && DIRECTIVE_OPTION.test(lines[cursor])) cursor += 1;
    while (cursor < lines.length && lines[cursor].trim() === '') cursor += 1;

    const body: string[] = [];
    let base: number | null = null;
    for (; cursor < lines.length; cursor += 1) {
      const line = lines[cursor];
      if (line.trim() === '') {
        body.push('');
        continue;
      }
      const lead = line.length - line.trimStart().length;
      if (lead <= indent) break;
      if (base === null) base = lead;
      body.push(line.slice(Math.min(base, lead)));
    }
    while (body.length && body[body.length - 1] === '') body.pop();

    out.push('```' + language, ...stripPrompts(body), '```');
    i = cursor - 1;
  }

  return out;
}

/**
 * A run of `>>>` lines, as a fenced Python block. Markdown reads a leading `>` as a
 * blockquote, so `>>> session = openprotein.connect(…)` rendered as three nested quote bars.
 *
 * The prompts are stripped rather than kept: the result is directly runnable, which is what a
 * reader copying a one-line example wants, and `>>>` is not Python so shiki mis-highlights it.
 */
function fenceDoctests(lines: string[]): string[] {
  const out: string[] = [];
  let fenced = false;

  for (let i = 0; i < lines.length; i += 1) {
    if (FENCE.test(lines[i])) fenced = !fenced;
    if (fenced || !DOCTEST.test(lines[i])) {
      out.push(lines[i]);
      continue;
    }

    const block: string[] = [];
    for (; i < lines.length; i += 1) {
      const line = lines[i];
      if (line.trim() === '' || FENCE.test(line)) break;
      block.push(line);
    }
    i -= 1;

    out.push('```python', ...stripPrompts(block), '```');
  }

  return out;
}

/**
 * `>>> x` / `... y` -> `x` / `y`, then dedent by the block's own common indent so the code
 * starts at column 0 — a docstring's doctest is indented relative to the docstring, and
 * carrying that through left every example visibly inset inside its block.
 */
function stripPrompts(lines: string[]): string[] {
  const stripped = lines.some((line) => DOCTEST.test(line))
    ? lines.map((line) => {
        const match = DOCTEST.exec(line) ?? CONTINUATION.exec(line);
        return match ? match[1] + match[2] : line;
      })
    : lines;

  const indents = stripped
    .filter((line) => line.trim() !== '')
    .map((line) => line.length - line.trimStart().length);
  const common = indents.length ? Math.min(...indents) : 0;
  return common ? stripped.map((line) => (line.trim() === '' ? '' : line.slice(common))) : stripped;
}

export function normaliseDocstring(text: string): string {
  const lines = fenceDoctests(fenceCodeBlocks(text.split('\n')));

  let fenced = false;
  return lines
    .map((line) => {
      if (FENCE.test(line)) {
        fenced = !fenced;
        return line;
      }
      return fenced ? line : inline(line);
    })
    .join('\n');
}

/** Docstring prose as HTML. `headingShift` keeps any docstring heading below the member's. */
export async function renderDocstring(text: string, headingShift = 4): Promise<string> {
  return renderMarkdown(normaliseDocstring(text), { headingShift });
}
