import Link from 'next/link';
import { readPyEntry, pyEntrySummary, pyMemberValue, sharedTaskMembers, type PyDocument, type PyMember } from '@/lib/python-api';
import { PY_API_URL } from '@/lib/site';
import { MemberHeading, PyCard } from './collapsible';
import { Prose, Sections } from './sections';
import { DottedName, KindLabel, Signature } from './signature';
import { SourceLink } from './source-link';
import { Overloads } from './overloads';
import { TypeRef } from './type-ref';

/**
 * One `.. autoclass::` block, as a collapsed card.
 *
 * The element ids are the dotted paths Sphinx used, verbatim and unslugified, so every
 * inbound deep link — `…/api-reference/fold.html#openprotein.fold.FoldAPI.get_results` —
 * still resolves.
 */
export async function PyClass({ path }: { path: string }) {
  const { entry, document } = await readPyEntry(path);
  const members = entry.members ?? [];
  const shared = sharedTaskMembers(entry, document);
  const detailed = members.filter((member) => !shared.has(member.name));

  return (
    <PyCard
      id={entry.path}
      summary={pyEntrySummary(entry)}
      code={`${entry.path}${entry.display_signature ?? entry.signature}`}
      memberAnchors={members.map((member) => `${entry.path}.${member.name}`)}
      action={<SourceLink document={document} source={entry.source} />}
      header={
        <>
          <KindLabel kind={entry.kind} />
          <DottedName path={entry.path} />
          <Signature text={entry.display_signature ?? entry.signature} className="text-xs" />
        </>
      }
    >
      <Overloads name={entry.name} overloads={entry.overload_contracts} />
      {entry.bases_parts?.length ? (
        <p className="not-prose mb-2 text-xs text-fd-muted-foreground">
          Bases:{' '}
          {entry.bases_parts.map((parts, index) => (
            <span key={index}>
              {index > 0 ? ', ' : ''}
              <TypeRef parts={parts} className="font-mono text-xs" />
            </span>
          ))}
        </p>
      ) : null}

      {/* The raw docstring still carries its NumPy `Attributes` / `Returns` blocks as plain
          text, and those render as members and as sections below — so prefer the parsed
          `text` section and fall back to the raw docstring only when nothing was parsed. */}
      {entry.parsed?.some((section) => section.kind === 'text') ? null : (
        <Prose text={entry.doc} shift={4} />
      )}
      <Sections sections={entry.parsed} skip={['attributes']} />

      {detailed.length ? (
        <div className="mt-4 flex flex-col">
          {detailed.map((member) => (
            <Member key={member.name} owner={entry.path} member={member} document={document} />
          ))}
        </div>
      ) : null}
      {shared.size ? (
        <div className="not-prose mt-4 border-t border-fd-border pt-3 text-sm">
          <p className="font-medium">Shared Future members</p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
            {[...shared].map(([name, target]) => (
              <li key={name}>
                <a
                  id={`${entry.path}.${name}`}
                  href={`#${target}`}
                  className="scroll-mt-24 font-mono text-[color:var(--py-type)] underline underline-offset-4"
                >
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PyCard>
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
  const value = pyMemberValue(member);

  return (
    <div className="border-t border-fd-border py-3 first:border-t-0">
      <MemberHeading
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
          <>
            {member.annotation ? <span className="font-mono text-sm text-fd-muted-foreground">:</span> : null}
            <TypeRef parts={member.annotation_parts} fallback={member.annotation} />
            {value ? <span className="font-mono text-sm text-fd-muted-foreground">= {value}</span> : null}
          </>
        )}
        {isCallable && (member.returns_parts?.length || member.returns) ? (
          <>
            <span className="font-mono text-sm text-fd-muted-foreground">→</span>
            <TypeRef parts={member.returns_parts} fallback={member.returns} />
          </>
        ) : null}
        <SourceLink document={document} source={member.source} />
      </MemberHeading>

      {member.inherited_from ? (
        <p className="not-prose mt-1 text-xs text-fd-muted-foreground">
          inherited from{' '}
          {member.inherited_from_ref ? (
            /* `inherited_from` is the *defining* module path; the link goes to the documented
               one, which is where the reader can actually read it. */
            <Link
              href={`${PY_API_URL}/${member.inherited_from_ref.page}#${member.inherited_from_ref.path}`}
              className="font-mono text-[color:var(--py-type)] underline-offset-4 hover:underline"
            >
              {member.inherited_from_ref.path}
            </Link>
          ) : (
            <span className="font-mono">{member.inherited_from}</span>
          )}
        </p>
      ) : null}

      {member.synthetic === 'pydantic' ? (
        <p className="not-prose mt-1 text-xs text-fd-muted-foreground">
          pydantic model configuration
        </p>
      ) : null}

      <Overloads name={member.name} overloads={member.overload_contracts} />

      <div className="mt-1">
        {member.parsed?.some((section) => section.kind === 'text') ? null : (
          <Prose text={member.doc} />
        )}
        <Sections sections={member.parsed} />
      </div>
    </div>
  );
}
