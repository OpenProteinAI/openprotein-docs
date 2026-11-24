export interface Snippet {
  /** Inserted at the cursor. */
  insert: string;
  /** Rendered in the toolbar tooltip. */
  example: string;
  /** Builds the snippet around selected text. */
  wrap?: (content: string) => string;
}

const SLOT = '\u0000';

/** Strips the indent the lines share. */
function dedent(text: string): string {
  const indents = text.split('\n').filter((line) => line.trim()).map((line) => /^[ \t]*/.exec(line)![0].length);
  const cut = Math.min(...indents);
  return cut ? text.replace(new RegExp(`^[ \\t]{${cut}}`, 'gm'), '') : text;
}

/** `template` with its SLOT filled by a selection, re-indented to fit. */
function slotted(template: string, placeholder: string, example?: string): Snippet {
  const at = template.indexOf(SLOT);
  const indent = template.slice(template.lastIndexOf('\n', at) + 1, at);
  const wrap = (content: string) => template.replace(SLOT, () => dedent(content).replace(/\n(?=.)/g, `\n${indent}`));
  const insert = wrap(placeholder);
  return { insert, example: example ?? insert, wrap };
}

/** A code block built around `code`. */
function code(build: (code: string) => string, placeholder: string): Snippet {
  const insert = build(placeholder);
  return { insert, example: insert, wrap: (content) => build(dedent(content)) };
}

export const CALLOUT_TYPES = [
  { type: 'info', label: 'Info' },
  { type: 'tip', label: 'Tip' },
  { type: 'idea', label: 'Idea' },
  { type: 'warn', label: 'Warning' },
  { type: 'error', label: 'Error' },
  { type: 'success', label: 'Success' },
] as const;

export type CalloutType = (typeof CALLOUT_TYPES)[number]['type'];

export function calloutSnippet(type: CalloutType): Snippet {
  return slotted(
    `<Callout type="${type}" title="Title">\n  ${SLOT}\n</Callout>\n`,
    'Text',
    `<Callout type="${type}" title="Coming from the old docs?">\n  Old Sphinx links redirect to their new pages automatically.\n</Callout>\n`,
  );
}

const FENCE = '```';
const CONNECT = 'import openprotein\n\nsession = openprotein.connect(username, password)';
const DIFF = `${FENCE}python title="script.py" lineNumbers\nsession = openprotein.connect(username) # [!code --]\nsession = openprotein.connect(username, password) # [!code ++]\n${FENCE}\n`;

/** Same text inserted and previewed. */
function same(text: string): Snippet {
  return { insert: text, example: text };
}

export const SNIPPETS = {
  cards: slotted(
    `<Cards>\n  <Card title="Title 1" href="/path" description="Description 1">\n    ${SLOT}\n  </Card>\n  <Card title="Title 2" href="/path" description="Description 2">\n    Content 2\n  </Card>\n</Cards>\n`,
    'Content 1',
  ),
  tabs: slotted(
    `<Tabs items={['App', 'Python']}>\n  <Tab value="App">\n    ${SLOT}\n  </Tab>\n  <Tab value="Python">\n    Python_content\n  </Tab>\n</Tabs>\n`,
    'App_content',
  ),
  steps: slotted(
    `<Steps>\n<Step>\n\n${SLOT}\n\n</Step>\n<Step>\n\n### Second step\n\nWhat to do next.\n\n</Step>\n</Steps>\n`,
    '### First step\n\nWhat to do.',
    '<Steps>\n<Step>\n\n### Upload your dataset\n\n</Step>\n<Step>\n\n### Train a model\n\n</Step>\n</Steps>\n',
  ),
  accordions: slotted(
    `<Accordions type="multiple">\n  <Accordion title="Question 1">\n    ${SLOT}\n  </Accordion>\n  <Accordion title="Question 2">\n    Answer 2\n  </Accordion>\n</Accordions>\n`,
    'Answer 1',
  ),
  figure: {
    insert: '<Figure src="/_static/path/to/image.png" alt="Describe the image" caption="Caption" />\n',
    example: '<Figure src="/_static/walkthroughs/nanobody/pdl1-1.png" caption="Caption under the image" />\n',
  },
  screencast: {
    insert: '<Screencast src="/_static/path/to/recording.gif" alt="Describe the recording" />\n',
    example: '<Screencast src="/_static/walkthroughs/antibody/ab-image4.gif" caption="A looping screen recording" />\n',
  },
  codeblock: code((text) => `${FENCE}text lineNumbers\n${text}\n${FENCE}\n`, 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
  codesyntax: code((text) => `${FENCE}python title="script.py" lineNumbers\n${text}\n${FENCE}\n`, CONNECT),
  codehighlight: code((text) => `${FENCE}python title="script.py" lineNumbers\n${text} # [!code highlight]\n${FENCE}\n`, CONNECT),
  codeword: code(
    (text) => `${FENCE}python title="script.py" lineNumbers\n# [!code word:${/[A-Za-z_]\w*/.exec(text)?.[0] ?? 'word'}]\n${text}\n${FENCE}\n`,
    'session = openprotein.connect(username, password)\nprint(session)',
  ),
  codediff: {
    insert: DIFF,
    example: DIFF,
    wrap: (content) => `${FENCE}python title="script.py" lineNumbers\n${dedent(content).replace(/^(.*\S.*)$/gm, '$1 # [!code ++]')}\n${FENCE}\n`,
  },
  codetabs: code(
    (text) => `${FENCE}python tab="Python" lineNumbers\n${text}\n${FENCE}\n\n${FENCE}bash tab="cURL" lineNumbers\ncurl https://api.openprotein.ai\n${FENCE}\n`,
    'import openprotein',
  ),
  typetable: {
    insert:
      "<TypeTable\n  type={{\n    name: {\n      description: 'What it does.',\n      type: 'string',\n      default: \"'value'\",\n    },\n  }}\n/>\n",
    example:
      "<TypeTable\n  type={{\n    num_samples: {\n      description: 'Sequences to generate.',\n      type: 'int',\n      default: '100',\n    },\n  }}\n/>\n",
  },
  table: same('| Column | Column |\n| --- | --- |\n| Cell | Cell |\n'),
} satisfies Record<string, Snippet>;

export type SnippetId = keyof typeof SNIPPETS;

/** `${1:x}` takes the selection, `${2:…}` comes next. */
export interface MathSnippet {
  tex: string;
  /** Right after a base. */
  attach?: string;
  /** Brace a multi-token selection. */
  group?: boolean;
  /** `$$` block, not `$…$`. */
  display?: boolean;
}

const MATH_SLOT = /\$\{(\d):((?:[^{}]|\{[^{}]*\})*)\}/g;
const TOKEN = /^(?:\\[A-Za-z]+|\\?.)$/;

/** TeX and the slot to select. */
export function expandMath(
  snippet: MathSnippet,
  selection: string,
  { before = '', inline = false }: { before?: string; inline?: boolean } = {},
): { text: string; select: [number, number]; done: boolean } {
  const attach = !selection && snippet.attach && /[\w)\]}|'!]$/.test(before);
  let template = attach ? snippet.attach! : snippet.tex;
  if (inline) template = template.replace(/\s*\n\s*/g, ' ');
  const fill = snippet.group && !TOKEN.test(selection.trim()) ? `{${selection}}` : selection;
  const slots: { n: number; from: number; to: number; filled: boolean }[] = [];
  let text = '';
  let last = 0;
  for (const match of template.matchAll(MATH_SLOT)) {
    text += template.slice(last, match.index);
    const n = Number(match[1]);
    const filled = n === 1 && Boolean(selection);
    const value = filled ? fill : match[2];
    slots.push({ n, from: text.length, to: text.length + value.length, filled });
    text += value;
    last = match.index + match[0].length;
  }
  text += template.slice(last);
  slots.sort((a, b) => a.n - b.n);
  const target = selection ? slots.find((slot) => !slot.filled) : slots[0];
  return { text, select: target ? [target.from, target.to] : [text.length, text.length], done: !target };
}

const sized = (open: string, close: string): MathSnippet => ({ tex: `\\left${open} \${1:} \\right${close}` });

export const MATH = {
  inline: { tex: '${1:x}' },
  block: { tex: '${1:x}', display: true },
  frac: { tex: '\\frac{${1:a}}{${2:b}}' },
  sup: { tex: '${1:x}^{${2:n}}', attach: '^{${2:n}}', group: true },
  sub: { tex: '${1:x}_{${2:i}}', attach: '_{${2:i}}', group: true },
  sqrt: { tex: '\\sqrt{${1:x}}' },
  sum: { tex: '\\sum_{${2:i=1}}^{${3:n}} ${1:}' },
  int: { tex: '\\int_{${2:a}}^{${3:b}} ${1:}' },
  lim: { tex: '\\lim_{${2:x \\to 0}} ${1:}' },
  log: { tex: '\\log_{${2:b}} ${1:x}' },
  parens: sized('(', ')'),
  brackets: sized('[', ']'),
  braces: sized('\\{', '\\}'),
  abs: sized('|', '|'),
  norm: sized('\\|', '\\|'),
  angle: sized('\\langle', '\\rangle'),
  floor: sized('\\lfloor', '\\rfloor'),
  ceil: sized('\\lceil', '\\rceil'),
  cases: { tex: '\\begin{cases}\n  ${1:a} & \\text{if } x > 0 \\\\\n  b & \\text{otherwise}\n\\end{cases}', display: true },
  aligned: { tex: '\\begin{aligned}\n  ${1:a} &= b \\\\\n  c &= d\n\\end{aligned}', display: true },
} satisfies Record<string, MathSnippet>;

export type MatrixKind = 'pmatrix' | 'bmatrix' | 'vmatrix' | 'matrix';

export function matrixSnippet(rows: number, cols: number, kind: MatrixKind): MathSnippet {
  const lines = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (r || c ? `a_{${r + 1}${c + 1}}` : '${1:a_{11}}')).join(' & '),
  );
  return { tex: `\\begin{${kind}}\n  ${lines.join(' \\\\\n  ')}\n\\end{${kind}}`, display: true };
}

export function commandSnippet(name: string, placeholder: string): MathSnippet {
  return { tex: `\\${name}{\${1:${placeholder}}}` };
}

export function symbolSnippet(tex: string): MathSnippet {
  return { tex };
}
