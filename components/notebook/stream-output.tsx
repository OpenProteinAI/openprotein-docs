import type { ReactNode } from 'react';
import type { NotebookOutput } from '@/lib/notebook';

type Stream = Extract<NotebookOutput, { kind: 'stream' }>;

/** After the parser merges adjacent streams, only 7 of 242 are longer than this. */
const FOLD_AT = 30;

export const OUTPUT_PRE =
  'overflow-x-auto whitespace-pre-wrap break-words px-3 py-2 font-mono text-sm leading-relaxed';

const WARN_TINT =
  'border-[color-mix(in_oklab,var(--brand-3-fill)_55%,transparent)] bg-[color-mix(in_oklab,var(--brand-3-fill)_12%,transparent)]';

const WARN_INK = 'text-[var(--brand-3-ink)]';

export function lineCount(text: string): number {
  return text.split('\n').length;
}

export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** Native <details> keeps long logs foldable with zero client JS. */
export function Foldable({
  summary,
  warn = false,
  children,
}: {
  summary: string;
  warn?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={`rounded-md border ${warn ? WARN_TINT : 'border-fd-border bg-fd-muted'}`}>
      <summary
        className={`cursor-pointer px-3 py-1.5 font-mono text-xs ${warn ? WARN_INK : 'text-fd-muted-foreground'}`}
      >
        {summary}
      </summary>
      {children}
    </details>
  );
}

export function StreamOutput({ output }: { output: Stream }) {
  const warn = output.name === 'stderr';
  const lines = lineCount(output.text);
  const body = (
    <pre className={`${OUTPUT_PRE} ${warn ? WARN_INK : 'text-fd-muted-foreground'}`}>
      {output.text}
    </pre>
  );

  // stderr is always folded: one notebook emits 108 lines of progress bars.
  if (!warn && lines <= FOLD_AT) return body;
  return (
    <Foldable warn={warn} summary={`${output.name} (${plural(lines, 'line')})`}>
      {body}
    </Foldable>
  );
}
