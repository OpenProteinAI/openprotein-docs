import type { ReactNode } from 'react';

/** Execution count, source and outputs; shared by the page and the editor's preview. */
export function CodeCellFrame({
  executionCount,
  code,
  outputs,
}: {
  executionCount: number | null;
  code: ReactNode;
  outputs: ReactNode[];
}) {
  return (
    <div className="my-5 flex items-start gap-2">
      <span className="w-10 shrink-0 pt-2.5 text-right font-mono text-xs text-fd-muted-foreground select-none">
        {executionCount === null ? '[ ]' : `[${executionCount}]`}
      </span>
      <div className="min-w-0 flex-1">
        {code}
        {outputs.length > 0 ? <div className="mt-2 flex flex-col gap-2">{outputs}</div> : null}
      </div>
    </div>
  );
}
