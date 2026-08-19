import Link from 'next/link';
import { FOOTER_COLUMNS } from '@/lib/home-content';

export function SiteFooter() {
  return (
    <footer className="border-t border-fd-border bg-fd-muted">
      <div className="mx-auto grid w-full max-w-(--fd-layout-width) gap-8 px-4 py-11 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <img src="/logo_full.svg" alt="OpenProtein.AI Guide" width={202} height={22} className="h-[22px] w-auto dark:hidden" />
          <img src="/logo_full_dark.svg" alt="" aria-hidden width={202} height={22} className="hidden h-[22px] w-auto dark:block" />
          <p className="mt-2.5 max-w-[34ch] text-xs leading-[1.6] text-fd-muted-foreground">
            Protein engineering models, assay-driven design, and structure prediction in one
            platform.
          </p>
          <p className="mt-2.5 text-xs text-fd-muted-foreground">
            © {new Date().getFullYear()} NE47 Bio — All Rights Reserved.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <div className="mb-3 text-xs font-semibold tracking-[0.08em] uppercase text-fd-muted-foreground">
              {column.title}
            </div>
            <div className="flex flex-col gap-2.5">
              {column.links.map((link) =>
                link.href.startsWith('http') ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-fd-foreground transition-colors hover:text-fd-primary"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm text-fd-foreground transition-colors hover:text-fd-primary"
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </footer>
  );
}
