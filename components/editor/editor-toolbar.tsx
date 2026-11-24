'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import {
  Bold,
  Braces,
  ChevronDown,
  ChevronsUpDown,
  CircleCheck,
  Diff,
  FileCode,
  Highlighter,
  CircleX,
  Clapperboard,
  Code,
  Image,
  Info,
  Italic,
  LayoutGrid,
  Lightbulb,
  Link,
  List,
  ListOrdered,
  ListTodo,
  PanelTop,
  Shapes,
  Sigma,
  SquareCode,
  Table,
  TextQuote,
  TriangleAlert,
  WandSparkles,
  WholeWord,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/site/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { renderMdx } from '@/lib/editor/render';
import { CALLOUT_TYPES, calloutSnippet, SNIPPETS, type CalloutType, type Snippet } from '@/lib/editor/snippets';
import { MATH_TOOLBAR_ID } from './math-toolbar';
import type { SourceEditorHandle } from './source-editor';
import { useDismiss } from './use-dismiss';

type Editor = RefObject<SourceEditorHandle | null>;

const LIST_MARK = /^(\s*)([-*+]|\d+\.)\s+/;
const HEADING_MARK = /^#{1,6}\s+/;

const CALLOUT_LOOK: Record<CalloutType, { ink: string; fill: string; Icon: LucideIcon }> = {
  info: { ink: 'var(--brand-1-ink)', fill: 'var(--brand-1-fill)', Icon: Info },
  tip: { ink: 'var(--brand-1-ink)', fill: 'var(--brand-1-fill)', Icon: Info },
  idea: { ink: 'var(--brand-1-ink)', fill: 'var(--brand-1-fill)', Icon: Lightbulb },
  warn: { ink: 'var(--brand-3-ink)', fill: 'var(--brand-3-fill)', Icon: TriangleAlert },
  error: { ink: 'var(--color-fd-error)', fill: 'var(--color-fd-error)', Icon: CircleX },
  success: { ink: 'var(--color-fd-success)', fill: 'var(--color-fd-success)', Icon: CircleCheck },
};

const previews = new Map<string, Promise<ReactNode>>();

/** The example as the docs render it; cached per snippet. */
function SnippetPreview({ source }: { source: string }) {
  const [content, setContent] = useState<ReactNode>(null);
  useEffect(() => {
    let current = true;
    let pending = previews.get(source);
    if (!pending) {
      pending = renderMdx(source).then((result) => result.content, () => null);
      previews.set(source, pending);
    }
    void pending.then((value) => {
      if (current) setContent(value);
    });
    return () => {
      current = false;
    };
  }, [source]);
  return <div className="prose op-preview text-sm">{content}</div>;
}

/** Hover card: name, where it comes from, and the rendered example. */
function PreviewTip({
  name,
  from,
  blurb,
  example,
  body,
  side = 'bottom',
  children,
}: {
  name: string;
  from: string;
  blurb: string;
  /** Rendered as the docs would; or pass `body` instead. */
  example?: string;
  body?: ReactNode;
  side?: 'bottom' | 'right';
  children: ReactNode;
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={150}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align="start"
            sideOffset={6}
            collisionPadding={8}
            className="z-50 flex w-[21.25rem] max-w-[calc(100vw-1rem)] flex-col gap-2 rounded-[0.75em] border border-fd-border bg-fd-popover p-3 text-fd-foreground shadow-lg"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{name}</span>
              <code className="rounded-md bg-fd-muted px-1.5 py-0.5 text-xs text-fd-muted-foreground">{from}</code>
            </div>
            <p className="text-sm text-fd-muted-foreground">{blurb}</p>
            {example ? (
              <div className="max-h-[16.25rem] overflow-hidden rounded-lg bg-fd-background">
                <SnippetPreview source={example} />
              </div>
            ) : null}
            {body}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

function ToolButton({ label, keys, onClick, children }: { label: string; keys?: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="flat" size="compact" aria-label={label} onClick={onClick} className="px-2">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{keys ? `${label} (${keys})` : label}</TooltipContent>
    </Tooltip>
  );
}

function Separator() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-fd-border" />;
}

/** A toolbar button that opens a short menu below it. */
function MenuButton({
  label,
  icon,
  open,
  setOpen,
  tip,
  children,
}: {
  label: ReactNode;
  icon?: ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  tip?: (button: ReactNode) => ReactNode;
  children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);
  useDismiss(root, open, close);
  const button = (
    <Button
      variant="flat"
      size="compact"
      selected={open}
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className="ps-2 pe-1.5"
    >
      {icon}
      {label}
      <ChevronDown className="size-3.5 opacity-70" />
    </Button>
  );
  return (
    <div ref={root} className="relative">
      {tip && !open ? tip(button) : button}
      {open ? (
        <div
          role="menu"
          className="absolute top-[calc(100%+0.375rem)] left-0 z-50 min-w-[13.75rem] overflow-hidden rounded-[0.75em] border border-fd-border bg-fd-popover p-1 shadow-lg"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

const CODE: {
  id: 'codeblock' | 'codesyntax' | 'codehighlight' | 'codeword' | 'codediff' | 'codetabs';
  name: string;
  blurb: string;
  Icon: LucideIcon;
}[] = [
  { id: 'codeblock', name: 'Code block', blurb: 'Plain fenced code with line numbers.', Icon: SquareCode },
  { id: 'codesyntax', name: 'Syntax highlighting', blurb: 'Python colored by its syntax, with a file title.', Icon: FileCode },
  { id: 'codehighlight', name: 'Highlighted lines', blurb: 'A [!code highlight] comment marks its line.', Icon: Highlighter },
  { id: 'codeword', name: 'Highlighted word', blurb: 'A [!code word:…] comment marks that word below it.', Icon: WholeWord },
  { id: 'codediff', name: 'Diff', blurb: '[!code ++] and [!code --] comments mark added and removed lines.', Icon: Diff },
  { id: 'codetabs', name: 'Code tabs', blurb: 'One snippet in several languages.', Icon: PanelTop },
];

const ITEM =
  'flex w-full items-center gap-2.5 rounded-[0.6em] px-2.5 py-2 text-start text-sm transition-colors hover:bg-fd-primary/10 focus-visible:bg-fd-primary/10 focus-visible:outline-none';

const COMPONENTS: { id: 'cards' | 'tabs' | 'steps' | 'accordions' | 'figure' | 'screencast'; name: string; from: string; blurb: string; Icon: LucideIcon }[] = [
  { id: 'cards', name: 'Cards', from: 'fumadocs-ui', blurb: 'Grid of linked cards.', Icon: LayoutGrid },
  { id: 'tabs', name: 'Tabs', from: 'fumadocs-ui', blurb: 'Alternatives side by side, e.g. per language.', Icon: PanelTop },
  { id: 'steps', name: 'Steps', from: 'fumadocs-ui', blurb: 'Numbered procedure.', Icon: ListTodo },
  { id: 'accordions', name: 'Accordions', from: 'fumadocs-ui', blurb: 'Collapsible questions and details.', Icon: ChevronsUpDown },
  { id: 'figure', name: 'Figure', from: 'components/mdx/figure.tsx', blurb: 'Image with caption.', Icon: Image },
  { id: 'screencast', name: 'Screencast', from: 'components/mdx/screencast.tsx', blurb: 'Looping screen recording.', Icon: Clapperboard },
];

export function EditorToolbar({
  editor,
  onFormat,
  math,
  onMath,
}: {
  editor: Editor;
  onFormat: () => void;
  math: boolean;
  onMath: (on: boolean) => void;
}) {
  const [menu, setMenu] = useState<'headings' | 'callout' | 'code' | null>(null);
  const toggle = (name: 'headings' | 'callout' | 'code') => (open: boolean) => setMenu(open ? name : null);
  const insert = (snippet: Snippet) => {
    setMenu(null);
    editor.current?.insertBlock(snippet.insert, snippet.wrap);
  };
  const heading = (level: number) => {
    setMenu(null);
    editor.current?.prefixLines(() => (level ? `${'#'.repeat(level)} ` : ''), HEADING_MARK);
  };

  return (
    <div role="toolbar" aria-label="Formatting and components" className="flex flex-none flex-wrap items-center gap-0.5 border-b border-fd-border px-2 py-1.5">
      <MenuButton label="Headings" open={menu === 'headings'} setOpen={toggle('headings')}>
        {[2, 3, 4].map((level) => (
          <button key={level} type="button" role="menuitem" className={ITEM} onClick={() => heading(level)}>
            <span className="w-7 font-mono text-xs text-fd-muted-foreground">{'#'.repeat(level)}</span>
            Heading {level}
          </button>
        ))}
        <button type="button" role="menuitem" className={ITEM} onClick={() => heading(0)}>
          <span className="w-7 font-mono text-xs text-fd-muted-foreground">¶</span>
          Paragraph
        </button>
      </MenuButton>
      <Separator />
      <ToolButton label="Bold" keys="⌘B" onClick={() => editor.current?.wrap('**', '**', 'bold text')}>
        <Bold className="size-4" />
      </ToolButton>
      <ToolButton label="Italic" keys="⌘I" onClick={() => editor.current?.wrap('*', '*', 'italic text')}>
        <Italic className="size-4" />
      </ToolButton>
      <ToolButton label="Inline code" onClick={() => editor.current?.wrap('`', '`', 'code')}>
        <Code className="size-4" />
      </ToolButton>
      <ToolButton label="Link" onClick={() => editor.current?.wrap('[', '](/path)', 'link text')}>
        <Link className="size-4" />
      </ToolButton>
      <Separator />
      <ToolButton label="Bulleted list" onClick={() => editor.current?.prefixLines(() => '- ', LIST_MARK)}>
        <List className="size-4" />
      </ToolButton>
      <ToolButton label="Numbered list" onClick={() => editor.current?.prefixLines((i) => `${i + 1}. `, LIST_MARK)}>
        <ListOrdered className="size-4" />
      </ToolButton>
      <ToolButton label="Quote" onClick={() => editor.current?.prefixLines(() => '> ', /^>\s?/)}>
        <TextQuote className="size-4" />
      </ToolButton>
      <ToolButton label="Table" onClick={() => insert(SNIPPETS.table)}>
        <Table className="size-4" />
      </ToolButton>
      <Separator />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="flat" size="compact" onClick={onFormat} className="px-2">
            <WandSparkles className="size-4" />
            Format
          </Button>
        </TooltipTrigger>
        <TooltipContent>Format the document (⇧⌥F)</TooltipContent>
      </Tooltip>
      <Separator />
      <MenuButton
        label="Callout"
        icon={<Info className="size-4" />}
        open={menu === 'callout'}
        setOpen={toggle('callout')}
        tip={(button) => (
          <PreviewTip
            name="Callout"
            from="components/mdx/callout.tsx"
            blurb="Info, tip, idea, warning, error or success note. Click to pick one."
            example={calloutSnippet('info').example}
          >
            {button}
          </PreviewTip>
        )}
      >
        {CALLOUT_TYPES.map(({ type, label }) => {
          const { ink, fill, Icon } = CALLOUT_LOOK[type];
          return (
            <button
              key={type}
              type="button"
              role="menuitem"
              onClick={() => insert(calloutSnippet(type))}
              className="mb-1 flex w-full items-center gap-2.5 rounded-[0.6em] px-2.5 py-2 text-start text-sm last:mb-0 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-fd-ring"
              style={{ color: ink, background: `color-mix(in oklab, ${fill} 10%, var(--color-fd-popover))` }}
            >
              <Icon className="size-4" />
              <span className="font-medium">{label}</span>
              <code className="ms-auto text-xs text-fd-muted-foreground">{type}</code>
            </button>
          );
        })}
      </MenuButton>
      {COMPONENTS.map(({ id, name, from, blurb, Icon }) => (
        <PreviewTip key={id} name={name} from={from} blurb={blurb} example={SNIPPETS[id].example}>
          <Button variant="flat" size="compact" onClick={() => insert(SNIPPETS[id])} className="px-2">
            <Icon className="size-4" />
            {name}
          </Button>
        </PreviewTip>
      ))}
      <MenuButton
        label="Code"
        icon={<SquareCode className="size-4" />}
        open={menu === 'code'}
        setOpen={toggle('code')}
        tip={(button) => (
          <PreviewTip
            name="Code"
            from="Markdown"
            blurb="Code blocks with syntax colors, highlights or a diff, and code tabs. Click to pick one."
            example={SNIPPETS.codesyntax.example}
          >
            {button}
          </PreviewTip>
        )}
      >
        {CODE.map(({ id, name, blurb, Icon }) => (
          <PreviewTip key={id} name={name} from="Markdown" blurb={blurb} example={SNIPPETS[id].example} side="right">
            <button type="button" role="menuitem" className={ITEM} onClick={() => insert(SNIPPETS[id])}>
              <Icon className="size-4 text-fd-muted-foreground" />
              {name}
            </button>
          </PreviewTip>
        ))}
      </MenuButton>
      <PreviewTip name="Type table" from="fumadocs-ui" blurb="Parameters with types and defaults." example={SNIPPETS.typetable.example}>
        <Button variant="flat" size="compact" onClick={() => insert(SNIPPETS.typetable)} className="px-2">
          <Braces className="size-4" />
          Type table
        </Button>
      </PreviewTip>
      <PreviewTip
        name="Icons"
        from="lucide.dev"
        blurb="Opens the Lucide icon set in a new tab."
        body={
          <>
            <ol className="list-decimal space-y-1 ps-5 text-sm">
              <li>Pick an icon on lucide.dev.</li>
              <li>
                Click <span className="font-medium">Copy JSX</span>.
              </li>
              <li>
                Paste it here, e.g. <code className="text-xs">{'<Bird />'}</code>
              </li>
            </ol>
            <p className="text-xs text-fd-muted-foreground">
              Its import is added at the top for you:
              <br />
              <code>{"import { Bird } from 'lucide-react';"}</code>
            </p>
          </>
        }
      >
        <a
          href="https://lucide.dev/icons/"
          target="_blank"
          rel="noopener noreferrer"
          className="op-btn op-btn--flat min-h-[1.875rem] px-2 py-1 text-sm"
        >
          <span className="op-btn__content">
            <Shapes className="size-4" />
            Icons
          </span>
        </a>
      </PreviewTip>
      <Separator />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="flat"
            size="compact"
            selected={math}
            aria-pressed={math}
            aria-controls={MATH_TOOLBAR_ID}
            onClick={() => onMath(!math)}
            className="px-2"
          >
            <Sigma className="size-4" />
            Math
          </Button>
        </TooltipTrigger>
        <TooltipContent>{math ? 'Hide the math toolbar' : 'Show the math toolbar: TeX equations'}</TooltipContent>
      </Tooltip>
    </div>
  );
}
