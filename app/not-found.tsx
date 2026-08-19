import Link from 'next/link';
import { Button } from '@/components/site/button';
import { SECTIONS } from '@/lib/sections';

// [grid-area:main]: unknown paths hit (docs)/[...slug], so this renders inside the
// layout grid and would otherwise be auto-placed into the ~200px gutter column.
export default function NotFound() {
  return (
    <main className="flex min-h-full w-full flex-col px-8 [grid-area:main]">
      <div className="py-20">
        <p className="mb-3 font-mono text-sm font-medium" style={{ color: 'var(--brand-2-ink)' }}>
          404
        </p>
        <h1 className="mb-3 text-3xl font-bold tracking-[-0.7px] text-fd-foreground">
          This page could not be found
        </h1>
        <p className="mb-8 max-w-[62ch] text-base leading-[1.7] text-fd-muted-foreground">
          The page may have moved during the migration from the previous documentation
          site. Try searching, or start from one of the sections below.
        </p>

        <div className="flex flex-wrap gap-2.5">
          <Button variant="main" href="/">
            Back to the docs home
          </Button>
          <Button variant="secondary" href="/getting-started">
            Getting started
          </Button>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-x-6 gap-y-2 border-t border-fd-border py-6">
        {SECTIONS.map((section) => (
          <Link
            key={section.url}
            href={section.url}
            className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            {section.text}
          </Link>
        ))}
      </div>
    </main>
  );
}
