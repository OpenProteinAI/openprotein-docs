import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import type { NotebookCell } from '@/lib/notebook';
import { Output } from './output';

type Cell = Extract<NotebookCell, { kind: 'code' }>;

export async function CodeCell({
  cell,
  language,
  file,
  firstEmbed,
}: {
  cell: Cell;
  language: string;
  file: string;
  firstEmbed: number;
}) {
  let embedSeen = 0;
  const gutter = cell.executionCount === null ? '[ ]' : `[${cell.executionCount}]`;

  return (
    <div className="my-5 flex items-start gap-2">
      <span className="w-10 shrink-0 pt-2.5 text-right font-mono text-xs text-fd-muted-foreground select-none">
        {gutter}
      </span>
      <div className="min-w-0 flex-1">
        {cell.source ? (
          // Unknown kernel languages fall back to plaintext inside fumadocs' highlighter.
          <ServerCodeBlock code={cell.source} lang={language} codeblock={{ allowCopy: true }} />
        ) : null}
        {cell.outputs.length > 0 ? (
          <div className="mt-2 flex flex-col gap-2">
            {cell.outputs.map((output, index) => (
              <Output
                key={index}
                output={output}
                file={file}
                embedIndex={output.kind === 'embed' ? firstEmbed + embedSeen++ : -1}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
