import { readPyEntry, type PyDocument, type PyMember } from '@/lib/python-api';
import { Prose, Sections } from './sections';
import { DottedName, KindLabel, Signature } from './signature';
import { SourceLink } from './source-link';

/**
 * One `.. autoclass::` block.
 *
 * The element ids are the dotted paths Sphinx used, verbatim and unslugified, so every
 * inbound deep link — `…/api-reference/fold.html#openprotein.fold.FoldAPI.get_results` —
 * still resolves after the migration.
 */
export async function PyClass({ path }: { path: string }) {
  const { entry, document } = await readPyEntry(path);

  return (
    <section className="mt-10 first:mt-0">
      <h3
        id={entry.path}
        className="not-prose m-0 flex scroll-mt-24 flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-fd-border pb-2 text-base font-normal"
      >
        <KindLabel kind={entry.kind} />
        <DottedName path={entry.path} />
        <Signature text={entry.signature} />
        <SourceLink document={document} source={entry.source} />
      </h3>

      {entry.bases?.length ? (
        <p className="not-prose mt-2 text-xs text-fd-muted-foreground">
          Bases: <span className="font-mono">{entry.bases.join(', ')}</span>
        </p>
      ) : null}

      <div className="mt-3">
        {/* The raw docstring still contains its NumPy `Attributes` / `Returns` blocks as
            plain text, and those are already rendered as members and as sections below — so
            prefer the parsed `text` section and fall back to the raw docstring only when the
            parser found nothing. */}
        {entry.parsed?.some((section) => section.kind === 'text') ? null : (
          <Prose text={entry.doc} shift={4} />
        )}
        {/* `attributes` is skipped: napoleon turned that section into members, which the
            member list below already renders. */}
        <Sections sections={entry.parsed} skip={['attributes']} />
      </div>

      {entry.members?.length ? (
        <div className="mt-5 flex flex-col">
          {entry.members.map((member) => (
            <Member key={member.name} owner={entry.path} member={member} document={document} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function Member({
  owner,
  member,
  document,
}: {
  owner: string;
  member: PyMember;
  document: PyDocument;
}) {
  const id = `${owner}.${member.name}`;
  const isCallable = member.kind === 'method';

  return (
    <div className="border-t border-fd-border py-3 first:border-t-0">
      <h4
        id={id}
        className="not-prose m-0 flex scroll-mt-24 flex-wrap items-baseline gap-x-2 gap-y-1 text-sm font-normal"
      >
        <KindLabel kind={member.kind} />
        <code className="not-prose font-mono text-sm font-semibold text-fd-foreground">
          {member.name}
        </code>
        {isCallable ? (
          <Signature text={member.signature} />
        ) : (
          <Signature text={member.annotation} kind={member.kind} />
        )}
        {isCallable && member.returns ? (
          <span className="font-mono text-sm text-[color:var(--py-type)]">→ {member.returns}</span>
        ) : null}
        <SourceLink document={document} source={member.source} />
      </h4>

      {member.inherited_from ? (
        <p className="not-prose mt-1 text-xs text-fd-muted-foreground">
          inherited from <span className="font-mono">{member.inherited_from}</span>
        </p>
      ) : null}

      {member.synthetic === 'pydantic' ? (
        <p className="not-prose mt-1 text-xs text-fd-muted-foreground">
          pydantic model configuration
        </p>
      ) : null}

      {member.overloads?.length ? (
        <div className="not-prose mt-1 flex flex-col gap-0.5">
          {member.overloads.map((overload, index) => (
            <code key={index} className="font-mono text-xs text-fd-muted-foreground">
              {member.name}
              {overload}
            </code>
          ))}
        </div>
      ) : null}

      <div className="mt-1">
        {/* A parsed `text` section already carries the summary prose, so rendering `doc` too
            would print it twice. Fall back to `doc` only when nothing was parsed. */}
        {member.parsed?.some((section) => section.kind === 'text') ? null : (
          <Prose text={member.doc} />
        )}
        <Sections sections={member.parsed} />
      </div>
    </div>
  );
}
