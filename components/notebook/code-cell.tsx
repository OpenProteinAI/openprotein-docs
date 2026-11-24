import { ServerCodeBlock } from 'fumadocs-ui/components/codeblock.rsc';
import type { NotebookCell } from '@/lib/notebook';
import { CodeCellFrame } from './code-cell-frame';
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

  return (
    <CodeCellFrame
      executionCount={cell.executionCount}
      code={
        cell.source ? (
          // Unknown kernel languages fall back to plaintext inside fumadocs' highlighter.
          <ServerCodeBlock code={cell.source} lang={language} codeblock={{ allowCopy: true }} />
        ) : null
      }
      outputs={cell.outputs.map((output, index) => (
        <Output
          key={index}
          output={output}
          file={file}
          embedIndex={output.kind === 'embed' ? firstEmbed + embedSeen++ : -1}
        />
      ))}
    />
  );
}
