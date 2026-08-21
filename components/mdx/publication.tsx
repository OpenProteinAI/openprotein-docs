import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * A paper on the Publications page: journal wordmark, title, authors, venue — the whole card a
 * single external link.
 *
 * Replaces `.. raw:: html` `<a class="card-publication">` blocks whose `<img height="36px">`
 * was unclosed, so MDX read the following `</div>` as closing the image. The logo heights in the
 * old markup varied per journal (36px, 71px, …) purely because the wordmarks have different
 * aspect ratios; a fixed box with `object-contain` does the same job without per-card numbers.
 */
export function Publications({ children }: { children: ReactNode }) {
  return <div className="not-prose my-6 flex flex-col gap-3">{children}</div>;
}

export function Publication({
  href,
  logo,
  journal,
  authors,
  venue,
  children,
}: {
  href: string;
  logo: string;
  /** Alt text for the wordmark — the journal, not the paper. */
  journal: string;
  authors: string;
  venue: string;
  /** The paper title. */
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex flex-col gap-4 rounded-[0.75em] border border-fd-border bg-fd-card p-4 no-underline transition-colors hover:border-fd-primary/60 hover:bg-fd-accent/40 sm:flex-row sm:items-center"
    >
      <span className="flex h-12 w-36 shrink-0 items-center justify-start sm:justify-center">
        <Image
          src={logo}
          alt={journal}
          width={144}
          height={48}
          className="max-h-12 w-auto object-contain"
        />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-fd-foreground">{children}</span>
        <span className="mt-1 block leading-relaxed text-fd-muted-foreground">
          {authors}
          <br />
          {venue}
        </span>
      </span>
    </a>
  );
}
