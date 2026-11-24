'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/site/button';
import { cn } from '@/lib/cn';
import { searchSymbols, SYMBOL_SETS, type MathSymbol } from '@/lib/editor/math-symbols';
import { loadMath } from '@/lib/editor/render';
import {
  commandSnippet,
  MATH,
  matrixSnippet,
  symbolSnippet,
  type MathSnippet,
  type MatrixKind,
} from '@/lib/editor/snippets';
import { Segmented } from './segmented';
import type { SourceEditorHandle } from './source-editor';

type Editor = RefObject<SourceEditorHandle | null>;

export const MATH_TOOLBAR_ID = 'op-math-toolbar';

const faces = new Map<string, Promise<ReactNode>>();

/** No MathML: the button has a name. */
function renderFace(tex: string): Promise<ReactNode> {
  let pending = faces.get(tex);
  if (!pending) {
    pending = loadMath()
      .then((convert) => convert(tex, false))
      .then(({ node }) => {
        node.children = node.children.filter((child) => child.type !== 'element' || child.tagName !== 'mjx-assistive-mml');
        delete node.properties.dataTex;
        return toJsxRuntime(node, { Fragment, jsx, jsxs, elementAttributeNameCase: 'react', stylePropertyNameCase: 'dom' });
      })
      .catch(() => tex);
    faces.set(tex, pending);
  }
  return pending;
}

function Face({ tex, className }: { tex: string; className?: string }) {
  const [face, setFace] = useState<ReactNode>(null);
  useEffect(() => {
    let current = true;
    void renderFace(tex).then((value) => {
      if (current) setFace(value);
    });
    return () => {
      current = false;
    };
  }, [tex]);
  return (
    <span aria-hidden className={cn('inline-flex min-w-[1em] items-center justify-center leading-none', className)}>
      {face}
    </span>
  );
}

interface Tip {
  name: string;
  tex: string;
  blurb?: string;
}

function MathTip({ tip, open, onOpenChange, children }: { tip: Tip; open?: boolean; onOpenChange?: (open: boolean) => void; children: ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="bottom"
            align="start"
            sideOffset={6}
            collisionPadding={8}
            className="z-50 flex max-w-[17.5rem] flex-col gap-1.5 rounded-[0.75em] border border-fd-border bg-fd-popover px-3 py-2.5 text-fd-foreground shadow-lg"
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{tip.name}</span>
              <code className="rounded-md bg-fd-muted px-1.5 py-0.5 text-xs">{tip.tex}</code>
            </span>
            {tip.blurb ? <span className="text-sm text-fd-muted-foreground">{tip.blurb}</span> : null}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

function Separator() {
  return <span aria-hidden className="mx-px h-5 w-px shrink-0 bg-fd-border" />;
}

function moveFocus(event: KeyboardEvent<HTMLElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role=menuitem]'));
  if (!items.length) return;
  const at = items.indexOf(document.activeElement as HTMLElement);
  const step = event.key === 'ArrowDown' ? 1 : -1;
  const next = at === -1 ? (step === 1 ? 0 : items.length - 1) : (at + step + items.length) % items.length;
  event.preventDefault();
  items[next].focus();
}

const FACE_BUTTON = 'min-w-[1.875rem] px-[0.1875rem]';
const ROW =
  'grid w-full grid-cols-[4rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[0.6em] py-1.5 ps-1.5 pe-2.5 text-start transition-colors hover:bg-fd-primary/10 focus-visible:bg-fd-primary/10 focus-visible:outline-none';

function MathMenu({
  label,
  face,
  tip,
  width,
  align = 'start',
  role = 'menu',
  children,
}: {
  label: string;
  face: ReactNode;
  tip?: Tip;
  /** A CSS length in rem. */
  width: string;
  align?: 'start' | 'end';
  role?: 'menu' | 'dialog';
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  // Focus stays in the editor.
  const inserted = useRef(false);
  const close = () => {
    inserted.current = true;
    setOpen(false);
  };
  const trigger = (
    <PopoverTrigger asChild>
      <Button
        variant="flat"
        size="compact"
        selected={open}
        aria-label={role === 'menu' ? label : undefined}
        aria-haspopup={role}
        className="ps-[0.3125rem] pe-[0.125rem] [&>.op-btn__content]:gap-0.5"
      >
        {face}
        <ChevronDown className="size-3 opacity-70" />
      </Button>
    </PopoverTrigger>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      {tip ? (
        <MathTip tip={tip} open={tipOpen && !open} onOpenChange={setTipOpen}>
          {trigger}
        </MathTip>
      ) : (
        trigger
      )}
      <PopoverContent
        align={align}
        sideOffset={6}
        collisionPadding={8}
        style={{ width }}
        className="max-w-[calc(100vw-1rem)] min-w-0 rounded-[0.75em] bg-fd-popover p-1.5 text-fd-foreground backdrop-blur-none"
        aria-label={role === 'dialog' ? label : undefined}
        onOpenAutoFocus={(event) => {
          const start = (event.target as HTMLElement | null)?.querySelector<HTMLElement>('[data-autofocus]');
          if (!start) return;
          event.preventDefault();
          start.focus();
        }}
        onCloseAutoFocus={(event) => {
          if (inserted.current) event.preventDefault();
          inserted.current = false;
        }}
      >
        {role === 'menu' ? (
          <div role="menu" aria-label={label} onKeyDown={moveFocus}>
            {children(close)}
          </div>
        ) : (
          children(close)
        )}
      </PopoverContent>
    </Popover>
  );
}

interface Item {
  name: string;
  snippet: MathSnippet;
  tex: string;
  face: string;
}

function MenuRows({ items, onPick, faceClass = 'text-[1.0625rem]' }: { items: Item[]; onPick: (snippet: MathSnippet) => void; faceClass?: string }) {
  return items.map((item) => (
    <button key={item.name} type="button" role="menuitem" className={ROW} onClick={() => onPick(item.snippet)}>
      <Face tex={item.face} className={faceClass} />
      <span className="truncate text-sm">{item.name}</span>
      <code className="text-xs text-fd-muted-foreground">{item.tex}</code>
    </button>
  ));
}

const BRACKETS: Item[] = [
  { name: 'Parentheses', snippet: MATH.parens, tex: '\\left( \\right)', face: '\\left(\\square\\right)' },
  { name: 'Square brackets', snippet: MATH.brackets, tex: '\\left[ \\right]', face: '\\left[\\square\\right]' },
  { name: 'Braces', snippet: MATH.braces, tex: '\\left\\{ \\right\\}', face: '\\left\\{\\square\\right\\}' },
  { name: 'Absolute value', snippet: MATH.abs, tex: '\\left| \\right|', face: '\\left|\\square\\right|' },
  { name: 'Norm', snippet: MATH.norm, tex: '\\left\\| \\right\\|', face: '\\left\\|\\square\\right\\|' },
  { name: 'Angle brackets', snippet: MATH.angle, tex: '\\left\\langle \\right\\rangle', face: '\\left\\langle\\square\\right\\rangle' },
  { name: 'Floor', snippet: MATH.floor, tex: '\\left\\lfloor \\right\\rfloor', face: '\\left\\lfloor\\square\\right\\rfloor' },
  { name: 'Ceiling', snippet: MATH.ceil, tex: '\\left\\lceil \\right\\rceil', face: '\\left\\lceil\\square\\right\\rceil' },
];

const ACCENTS: Item[] = (
  [
    ['Hat', 'hat', 'x'],
    ['Bar', 'bar', 'x'],
    ['Vector', 'vec', 'x'],
    ['Dot', 'dot', 'x'],
    ['Double dot', 'ddot', 'x'],
    ['Tilde', 'tilde', 'x'],
    ['Overline', 'overline', 'xy'],
    ['Underline', 'underline', 'xy'],
  ] as const
).map(([name, command, arg]) => ({ name, snippet: commandSnippet(command, arg), tex: `\\${command}{${arg}}`, face: `\\${command}{${arg}}` }));

const STYLES: Item[] = (
  [
    ['Text', 'text', 'text', '\\text{…}', '\\text{abc}'],
    ['Operator name', 'operatorname', 'softmax', '\\operatorname{…}', '\\operatorname{softmax}'],
    ['Bold', 'mathbf', 'x', '\\mathbf{x}', '\\mathbf{x}'],
    ['Bold symbol', 'boldsymbol', '\\alpha', '\\boldsymbol{\\alpha}', '\\boldsymbol{\\alpha}'],
    ['Upright', 'mathrm', 'x', '\\mathrm{x}', '\\mathrm{x}'],
    ['Blackboard bold', 'mathbb', 'R', '\\mathbb{R}', '\\mathbb{R}'],
    ['Calligraphic', 'mathcal', 'A', '\\mathcal{A}', '\\mathcal{A}'],
  ] as const
).map(([name, command, arg, tex, face]) => ({ name, snippet: commandSnippet(command, arg), tex, face }));

const STRUCTURES: { id: keyof typeof MATH; label: string; face: string; size: string; tip: Tip }[] = [
  { id: 'frac', label: 'Fraction', face: '\\frac{\\square}{\\square}', size: 'text-[0.875rem]', tip: { name: 'Fraction', tex: '\\frac{a}{b}', blurb: 'A selection becomes the numerator.' } },
  { id: 'sup', label: 'Superscript', face: '\\square^{\\square}', size: 'text-[0.875rem]', tip: { name: 'Superscript', tex: 'x^{n}', blurb: 'Right after a letter, adds just the exponent.' } },
  { id: 'sub', label: 'Subscript', face: '\\square_{\\square}', size: 'text-[0.875rem]', tip: { name: 'Subscript', tex: 'x_{i}', blurb: 'Right after a letter, adds just the index.' } },
  { id: 'sqrt', label: 'Square root', face: '\\sqrt{\\square}', size: 'text-[0.8125rem]', tip: { name: 'Square root', tex: '\\sqrt{x}', blurb: '\\sqrt[3]{x} for a cube root.' } },
  { id: 'sum', label: 'Sum', face: '\\sum_{\\square}^{\\square}', size: 'text-[0.8125rem]', tip: { name: 'Sum', tex: '\\sum_{i=1}^{n}', blurb: 'A selection becomes the summand.' } },
  { id: 'int', label: 'Integral', face: '\\int_{\\square}^{\\square}', size: 'text-[0.78125rem]', tip: { name: 'Integral', tex: '\\int_{a}^{b}', blurb: 'A selection becomes the integrand.' } },
  { id: 'lim', label: 'Limit', face: '\\lim_{\\square}', size: 'text-[0.8125rem]', tip: { name: 'Limit', tex: '\\lim_{x \\to 0}' } },
  { id: 'log', label: 'Logarithm', face: '\\log_{\\square}\\square', size: 'text-[0.8125rem]', tip: { name: 'Logarithm', tex: '\\log_{b} x', blurb: 'Leave out the base for \\log x; \\ln is the natural log.' } },
];

const MATRIX_KINDS: { value: MatrixKind; label: string }[] = [
  { value: 'pmatrix', label: '( )' },
  { value: 'bmatrix', label: '[ ]' },
  { value: 'vmatrix', label: '| |' },
  { value: 'matrix', label: 'None' },
];

const GRID = 6;

function MatrixPanel({ onPick }: { onPick: (snippet: MathSnippet) => void }) {
  const [size, setSize] = useState({ rows: 2, cols: 2 });
  const [kind, setKind] = useState<MatrixKind>('pmatrix');
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (event: KeyboardEvent, index: number) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: GRID, ArrowUp: -GRID }[event.key];
    const next = step === undefined ? -1 : index + step;
    if (next < 0 || next >= GRID * GRID || (Math.abs(step!) === 1 && Math.floor(next / GRID) !== Math.floor(index / GRID))) return;
    event.preventDefault();
    event.stopPropagation();
    cells.current[next]?.focus();
  };
  return (
    <>
      <div className="flex items-baseline justify-between px-2 pt-1 pb-2">
        <span className="font-medium">
          {size.rows} × {size.cols}
        </span>
        <code className="text-xs text-fd-muted-foreground">{`\\begin{${kind}}`}</code>
      </div>
      <div className="grid grid-cols-[repeat(6,1.625rem)] gap-[0.3125rem] px-2">
        {Array.from({ length: GRID * GRID }, (_, index) => {
          const rows = Math.floor(index / GRID) + 1;
          const cols = (index % GRID) + 1;
          const on = rows <= size.rows && cols <= size.cols;
          return (
            <button
              key={index}
              ref={(node) => {
                cells.current[index] = node;
              }}
              type="button"
              role="menuitem"
              aria-label={`${rows} by ${cols} matrix`}
              data-autofocus={rows === 2 && cols === 2 ? '' : undefined}
              onMouseEnter={() => setSize({ rows, cols })}
              onFocus={() => setSize({ rows, cols })}
              onKeyDown={(event) => move(event, index)}
              onClick={() => onPick(matrixSnippet(rows, cols, kind))}
              className={cn(
                'size-[1.625rem] rounded-[0.3125rem] border transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-fd-ring',
                on
                  ? 'border-fd-primary bg-[color-mix(in_oklab,var(--color-fd-primary)_28%,var(--color-fd-popover))]'
                  : 'border-fd-border bg-fd-background',
              )}
            />
          );
        })}
      </div>
      <Segmented
        label="Delimiters"
        value={kind}
        onChange={setKind}
        options={MATRIX_KINDS}
        className="mx-2 mt-2.5 mb-0.5 flex [&>button]:flex-1 [&>button]:justify-center"
      />
      <div aria-hidden className="mx-0.5 my-1.5 h-px bg-fd-border" />
      <MenuRows
        items={[
          { name: 'Cases', snippet: MATH.cases, tex: '\\begin{cases}', face: '\\begin{cases}\\square\\\\\\square\\end{cases}' },
          { name: 'Aligned', snippet: MATH.aligned, tex: '\\begin{aligned}', face: '\\begin{aligned}&=\\square\\\\&=\\square\\end{aligned}' },
        ]}
        onPick={onPick}
        faceClass="text-[0.6875rem]"
      />
    </>
  );
}

const COLUMNS = 10;

function SymbolsPanel({ onPick }: { onPick: (snippet: MathSnippet) => void }) {
  const [query, setQuery] = useState('');
  const [set, setSet] = useState(SYMBOL_SETS[0].id);
  const [hover, setHover] = useState<string | null>(null);
  const searching = Boolean(query.trim());
  const shown: MathSymbol[] = searching ? searchSymbols(query) : (SYMBOL_SETS.find((item) => item.id === set) ?? SYMBOL_SETS[0]).symbols;
  const current = shown.find((symbol) => symbol.tex === hover) ?? shown[0] ?? null;
  const grid = useRef<HTMLDivElement>(null);
  const move = (event: KeyboardEvent, index: number) => {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS }[event.key];
    if (step === undefined) return;
    const next = index + step;
    if (next < 0 || next >= shown.length) return;
    event.preventDefault();
    grid.current?.querySelectorAll<HTMLElement>('button')[next]?.focus();
  };
  return (
    <div className="flex flex-col p-1">
      <label className="op-field op-field-group">
        <Search aria-hidden className="ms-2.5 size-4 shrink-0 self-center text-fd-muted-foreground" />
        <input
          type="search"
          aria-label="Search symbols"
          placeholder="Search, e.g. arrow or \in"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setHover(null);
          }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown') return;
            event.preventDefault();
            grid.current?.querySelector<HTMLElement>('button')?.focus();
          }}
          className="text-sm text-fd-foreground placeholder:text-fd-muted-foreground"
        />
      </label>
      {searching ? (
        <p role="status" className="mx-0.5 mt-2.5 mb-1.5 text-xs text-fd-muted-foreground">
          {shown.length === 1 ? '1 symbol' : `${shown.length} symbols`}
        </p>
      ) : (
        <div role="group" aria-label="Symbol sets" className="mt-2 mb-1.5 flex border-b border-fd-border">
          {SYMBOL_SETS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={item.id === set}
              onClick={() => {
                setSet(item.id);
                setHover(null);
              }}
              className="-mb-px border-b-2 border-transparent px-1.5 py-1.5 text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground focus-visible:outline-2 focus-visible:outline-fd-ring aria-pressed:border-fd-primary aria-pressed:text-fd-foreground"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <div ref={grid} className="grid min-h-[2.25rem] grid-cols-[repeat(10,2.125rem)] gap-0.5 py-0.5">
        {shown.map((symbol, index) => (
          <button
            key={symbol.tex}
            type="button"
            aria-label={`${symbol.name}, ${symbol.tex}`}
            onMouseEnter={() => setHover(symbol.tex)}
            onFocus={() => setHover(symbol.tex)}
            onKeyDown={(event) => move(event, index)}
            onClick={() => onPick(symbolSnippet(symbol.tex))}
            className={cn(
              'grid size-[2.125rem] place-items-center rounded-[0.5em] text-[1.0625rem] transition-colors hover:bg-fd-primary/10 focus-visible:outline-2 focus-visible:outline-fd-ring',
              symbol === current && 'bg-fd-primary/10',
            )}
          >
            <Face tex={symbol.tex} />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex min-h-[2.75rem] items-center gap-2.5 border-t border-fd-border px-1.5 pt-2">
        {current ? (
          <>
            <Face tex={current.tex} className="w-[2.125rem] text-[1.375rem]" />
            <span className="flex min-w-0 flex-col">
              <code className="truncate text-sm">{current.tex}</code>
              <span className="truncate text-xs text-fd-muted-foreground">{current.name}</span>
            </span>
          </>
        ) : (
          <span className="text-sm text-fd-muted-foreground">No symbol matches.</span>
        )}
        <a
          href="https://docs.mathjax.org/en/latest/input/tex/macros/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="ms-auto shrink-0 text-xs text-fd-primary hover:underline"
        >
          All TeX commands
        </a>
      </div>
    </div>
  );
}

export function MathToolbar({ editor, inMath }: { editor: Editor; inMath: boolean }) {
  const insert = (snippet: MathSnippet) => editor.current?.insertMath(snippet);
  const pick = (close: () => void) => (snippet: MathSnippet) => {
    close();
    insert(snippet);
  };
  const outside = inMath ? ' The cursor is already in an equation.' : '';
  return (
    <div
      id={MATH_TOOLBAR_ID}
      role="toolbar"
      aria-label="Math"
      className="flex flex-none flex-wrap items-center border-b border-fd-border bg-[color-mix(in_oklab,var(--color-fd-primary)_5%,var(--color-fd-background))] px-1 py-1"
    >
      <MathTip tip={{ name: 'Inline math', tex: '$x$', blurb: `Wraps the selection, or starts an equation at the cursor.${outside}` }}>
        <Button variant="flat" size="compact" disabled={inMath} onClick={() => insert(MATH.inline)} className="px-1 text-sm [&>.op-btn__content]:gap-1">
          <span aria-hidden className="font-mono text-xs text-[color:var(--brand-2-ink)]">
            $
          </span>
          Inline
        </Button>
      </MathTip>
      <MathTip tip={{ name: 'Display math', tex: '$$ … $$', blurb: `Puts the equation on its own lines, centered on the page.${outside}` }}>
        <Button variant="flat" size="compact" disabled={inMath} onClick={() => insert(MATH.block)} className="px-1 text-sm [&>.op-btn__content]:gap-1">
          <span aria-hidden className="font-mono text-xs text-[color:var(--brand-2-ink)]">
            $$
          </span>
          Block
        </Button>
      </MathTip>
      <Separator />
      {STRUCTURES.map(({ id, label, face, size, tip }) => (
        <MathTip key={id} tip={tip}>
          <Button variant="flat" size="compact" aria-label={label} onClick={() => insert(MATH[id])} className={FACE_BUTTON}>
            <Face tex={face} className={size} />
          </Button>
        </MathTip>
      ))}
      <Separator />
      <MathMenu label="Brackets" face={<Face tex="\left(\square\right)" className="text-[0.84375rem]" />} tip={{ name: 'Brackets', tex: '\\left( \\right)', blurb: 'Sized to fit what is inside.' }} width="25rem">
        {(close) => (
          <>
            <div className="px-2 pt-1 pb-1.5 text-xs text-fd-muted-foreground">Sized to fit what is inside</div>
            <MenuRows items={BRACKETS} onPick={pick(close)} />
          </>
        )}
      </MathMenu>
      <MathMenu label="Matrix" face={<Face tex="\begin{pmatrix}\square&\square\\\square&\square\end{pmatrix}" className="text-[0.4375rem]" />} tip={{ name: 'Matrix', tex: '\\begin{pmatrix}', blurb: 'Pick a size; cases and aligned equations too.' }} width="18.125rem">
        {(close) => <MatrixPanel onPick={pick(close)} />}
      </MathMenu>
      <MathMenu label="Accents" face={<Face tex="\hat{\square}" className="text-[0.875rem]" />} tip={{ name: 'Accents', tex: '\\hat{x}' }} width="18.125rem">
        {(close) => <MenuRows items={ACCENTS} onPick={pick(close)} />}
      </MathMenu>
      <MathMenu label="Letter styles" face={<Face tex="\mathbb{R}" className="text-[0.875rem]" />} tip={{ name: 'Letter styles', tex: '\\mathbb{R}', blurb: 'Bold, blackboard, calligraphic, upright, text.' }} width="21.875rem">
        {(close) => <MenuRows items={STYLES} onPick={pick(close)} faceClass="text-[0.9375rem]" />}
      </MathMenu>
      <Separator />
      <MathMenu
        label="Symbols"
        role="dialog"
        align="end"
        width="23.75rem"
        face={
          <span className="flex items-center gap-1 text-sm">
            <Face tex="\Omega" className="text-[0.875rem]" />
            Symbols
          </span>
        }
      >
        {(close) => <SymbolsPanel onPick={pick(close)} />}
      </MathMenu>
    </div>
  );
}
