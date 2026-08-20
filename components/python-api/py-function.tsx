import { readPyEntry } from '@/lib/python-api';
import { Prose, Sections } from './sections';
import { DottedName, KindLabel, Signature } from './signature';
import { SourceLink } from './source-link';

/** One `.. autofunction::` block — only `openprotein.connect` uses it. */
export async function PyFunction({ path }: { path: string }) {
  const { entry, document } = await readPyEntry(path);

  return (
    <section className="mt-10 first:mt-0">
      <h3
        id={entry.path}
        className="not-prose m-0 flex scroll-mt-24 flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-fd-border pb-2 text-base font-normal"
      >
        <KindLabel kind="function" />
        <DottedName path={entry.path} />
        <Signature text={entry.signature} />
        {entry.returns ? (
          <span className="font-mono text-sm text-[color:var(--py-type)]">→ {entry.returns}</span>
        ) : null}
        <SourceLink document={document} source={entry.source} />
      </h3>
      <div className="mt-3">
        {entry.parsed?.some((section) => section.kind === 'text') ? null : (
          <Prose text={entry.doc} shift={4} />
        )}
        <Sections sections={entry.parsed} />
      </div>
    </section>
  );
}
