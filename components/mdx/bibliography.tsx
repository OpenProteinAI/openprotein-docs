import {
  citationLink,
  formatAuthors,
  formatCitation,
  getEntry,
  readAllBib,
  readBib,
  sortEntries,
} from '@/lib/bib';

const LINK = 'text-fd-primary underline underline-offset-2 hover:decoration-2';

/** ':cite:year:' rendered the year alone — the surrounding parens live in the prose. */
export async function Cite({ id, mode = 'year' }: { id: string; mode?: 'year' | 'authoryear' }) {
  const entry = getEntry(await readAllBib(), id);
  const label = mode === 'authoryear' ? `${formatAuthors(entry)}, ${entry.year}` : entry.year;
  return (
    <a href={`#ref-${id}`} className={LINK} title={entry.title}>
      {label}
    </a>
  );
}

export async function Bibliography({ files }: { files: string[] }) {
  const entries = sortEntries((await readBib(files)).values());

  return (
    <ol className="not-prose my-6 list-decimal space-y-3 ps-6 marker:text-fd-muted-foreground">
      {entries.map((entry) => {
        const link = citationLink(entry);
        return (
          <li key={entry.key} id={`ref-${entry.key}`} className="scroll-mt-24 leading-relaxed text-fd-muted-foreground">
            <span className="text-fd-foreground">{formatCitation(entry)}</span>{' '}
            {link ? (
              <a href={link.href} className={`${LINK} break-words`} target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
