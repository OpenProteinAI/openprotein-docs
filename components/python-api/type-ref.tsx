import Link from 'next/link';

export interface TypePart {
  text: string;
  /** Public dotted path, when this site documents the name. */
  path?: string;
  /** Reference page that documents it. */
  page?: string;
}

/**
 * A type annotation with its documented names linked.
 *
 * `Sequence[Complex | Protein | str | bytes] | MSAFuture` becomes three links and the
 * punctuation between them. The link targets come from the generator, which resolves each
 * name through griffe's import graph — `str` and `Sequence` stay plain because this site does
 * not document them.
 */
export function TypeRef({
  parts,
  fallback,
  className = 'font-mono text-sm text-fd-muted-foreground',
}: {
  parts?: TypePart[] | null;
  fallback?: string | null;
  className?: string;
}) {
  if (!parts?.length) {
    return fallback ? <span className={className}>{fallback}</span> : null;
  }

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.path && part.page ? (
          <Link
            key={index}
            href={`/python-api/api-reference/${part.page}#${part.path}`}
            className="text-[color:var(--py-type)] underline-offset-4 hover:underline"
          >
            {part.text}
          </Link>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </span>
  );
}
