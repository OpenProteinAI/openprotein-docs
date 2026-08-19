import Link from 'next/link';
import { FOOTER_COLUMNS } from '@/lib/home-content';
import { SHELL_COLUMN } from '@/lib/columns';

export function SiteFooter() {
  return (
    <footer className="border-t border-fd-border bg-fd-muted">
      <div className={`flex flex-col gap-10 py-11 lg:flex-row lg:items-start lg:justify-between ${SHELL_COLUMN}`}>
        <div>
          <img src="/logo_full.svg" alt="OpenProtein.AI Guide" width={313} height={34} className="h-[34px] w-auto dark:hidden" />
          <img src="/logo_full_dark.svg" alt="" aria-hidden width={313} height={34} className="hidden h-[34px] w-auto dark:block" />
          <p className="mt-2.5 max-w-[22rem] text-sm leading-[1.6] text-fd-muted-foreground">
            Protein engineering models, assay-driven design, and structure prediction in one platform.
          </p>
          <p className="mt-2.5 text-sm text-fd-muted-foreground">
            © {new Date().getFullYear()} NE47 Bio — All Rights Reserved.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:gap-x-30">
          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <div className="mb-3 text-sm font-semibold tracking-[0.08em] uppercase text-fd-muted-foreground">
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
      </div>
    </footer>
  );
}
