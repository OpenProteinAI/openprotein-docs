import type { NotebookOutput } from '@/lib/notebook';
import { EmbedFrame } from './embed-frame';
import { Foldable, OUTPUT_PRE, StreamOutput, lineCount, plural } from './stream-output';

const TEXT_FOLD_AT = 30;

const ERROR_TINT =
  'border-[color-mix(in_oklab,var(--color-fd-error)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-fd-error)_8%,transparent)]';

export function Output({
  output,
  file,
  embedIndex,
}: {
  output: NotebookOutput;
  file: string;
  embedIndex: number;
}) {
  switch (output.kind) {
    case 'stream':
      return <StreamOutput output={output} />;

    case 'embed':
      return (
        <EmbedFrame
          label={output.label}
          bytes={output.document.length}
          src={`/api/notebook-embed?file=${encodeURIComponent(file)}&index=${embedIndex}`}
        />
      );

    case 'image':
      return (
        // Matplotlib draws axes and labels in black, so the plate stays white in both themes.
        <img
          src={`data:${output.mime};base64,${output.base64}`}
          alt="Cell output figure"
          loading="lazy"
          decoding="async"
          // self-start: the flex column parent would otherwise stretch a small figure.
          className="h-auto max-h-[32rem] w-auto max-w-full self-start rounded-md border border-fd-border bg-white"
        />
      );

    case 'html':
      return (
        // A 40-column DataFrame scrolls in its own box rather than widening the page.
        <div className="overflow-x-auto rounded-md border border-fd-border bg-fd-card p-3">
          <div className="nb-html" dangerouslySetInnerHTML={{ __html: output.html }} />
        </div>
      );

    case 'text': {
      const lines = lineCount(output.text);
      const body = <pre className={`${OUTPUT_PRE} text-fd-muted-foreground`}>{output.text}</pre>;
      // Two results run past 1000 lines; folding keeps them from dominating the page.
      if (lines <= TEXT_FOLD_AT) return body;
      return <Foldable summary={`result (${plural(lines, 'line')})`}>{body}</Foldable>;
    }

    case 'javascript':
      return (
        <div className={`rounded-md border p-3 ${ERROR_TINT}`}>
          <p className="text-sm text-fd-foreground">
            This 3D viewer could not be recovered from the archived notebook.
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-fd-muted-foreground">
              Show the original script ({plural(lineCount(output.code), 'line')})
            </summary>
            <pre className={`${OUTPUT_PRE} mt-2 text-fd-muted-foreground`}>{output.code}</pre>
          </details>
        </div>
      );
  }
}
