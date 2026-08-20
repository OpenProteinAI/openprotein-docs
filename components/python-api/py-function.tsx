import { readPyEntry } from '@/lib/python-api';
import { PyCard } from './collapsible';
import { Prose, Sections } from './sections';
import { DottedName, KindLabel, Signature } from './signature';
import { SourceLink } from './source-link';
import { TypeRef } from './type-ref';

/** One `.. autofunction::` block — only `openprotein.connect` uses it. */
export async function PyFunction({ path }: { path: string }) {
  const { entry, document } = await readPyEntry(path);

  return (
    <PyCard
      id={entry.path}
      code={`${entry.path}${entry.signature}`}
      memberAnchors={[]}
      action={<SourceLink document={document} source={entry.source} />}
      header={
        <>
          <KindLabel kind="function" />
          <DottedName path={entry.path} />
          <Signature text={entry.signature} />
          {entry.returns_parts?.length || entry.returns ? (
            <>
              <span className="font-mono text-sm text-fd-muted-foreground">→</span>
              <TypeRef parts={entry.returns_parts} fallback={entry.returns} />
            </>
          ) : null}
        </>
      }
    >
      {entry.parsed?.some((section) => section.kind === 'text') ? null : (
        <Prose text={entry.doc} shift={4} />
      )}
      <Sections sections={entry.parsed} />
    </PyCard>
  );
}
