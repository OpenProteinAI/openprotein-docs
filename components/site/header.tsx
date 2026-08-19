'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import { FullSearchTrigger, SearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { SidebarTrigger } from 'fumadocs-ui/layouts/notebook/slots/sidebar';
import { Menu } from 'lucide-react';
import { Button } from '@/components/site/button';
import { ThemeToggle } from '@/components/site/theme-toggle';
import { SECTIONS } from '@/lib/sections';

// [grid-area:header] and --fd-header-height are load-bearing: this is the layout
// grid's header area. --fd-docs-row-1 needs the 0px fallback for HomeLayout.
const SHELL =
  'sticky [grid-area:header] flex flex-col top-[var(--fd-docs-row-1,0px)] z-20 backdrop-blur-[14px] transition-colors data-[transparent=false]:bg-fd-background/88 layout:[--fd-header-height:60px]';

interface Props extends ComponentProps<'header'> {
  /** Docs only: SidebarTrigger needs SidebarContext, which HomeLayout lacks. */
  withSidebarTrigger?: boolean;
}

function Header({ className, withSidebarTrigger, ...props }: Props) {
  const pathname = usePathname();

  return (
    <header
      id="nd-subnav"
      data-transparent="false"
      {...props}
      className={[SHELL, className].filter(Boolean).join(' ')}
    >
      <div
        data-header-body
        className="mx-auto flex h-15 w-full max-w-(--fd-layout-width) items-center gap-5 px-4"
      >
        {/* _dark variant because the wordmark is hard-coded #233E96 (1.62:1 on dark). */}
        <Link href="/" className="flex shrink-0 items-center" aria-label="OpenProtein.AI Guide">
          <img
            src="/logo.svg"
            alt="OpenProtein.AI Guide"
            width={34}
            height={34}
            className="h-[34px] w-auto sm:hidden"
          />
          <img
            src="/logo_full.svg"
            alt="OpenProtein.AI Guide"
            width={313}
            height={34}
            className="hidden h-[34px] w-auto sm:block dark:sm:hidden"
          />
          <img
            src="/logo_full_dark.svg"
            alt=""
            aria-hidden
            width={313}
            height={34}
            className="hidden h-[34px] w-auto dark:sm:block"
          />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-0.5 lg:flex">
          {SECTIONS.map((section) => (
            <Link
              key={section.url}
              href={section.url}
              data-active={pathname === section.url || pathname.startsWith(`${section.url}/`)}
              className="rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap text-fd-foreground transition-colors hover:bg-fd-muted data-[active=true]:bg-fd-accent data-[active=true]:text-fd-accent-foreground"
            >
              {section.text}
            </Link>
          ))}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-2.5 lg:flex-none">
          <FullSearchTrigger
            hideIfDisabled
            className="hidden h-[34px] w-[210px] rounded-[0.75em] border border-fd-border bg-fd-background text-sm text-fd-muted-foreground lg:flex"
          />
          <SearchTrigger hideIfDisabled className="lg:hidden" />
          <ThemeToggle />
          <Button
            variant="secondary"
            href="https://www.openprotein.ai/contact"
            external
            className="max-lg:hidden"
          >
            Contact
          </Button>
          <Button variant="main" href="/login">
            Log in
          </Button>
          {withSidebarTrigger ? (
            <SidebarTrigger className="flex size-[34px] shrink-0 items-center justify-center rounded-[0.75em] border border-fd-border text-fd-muted-foreground lg:hidden">
              <Menu className="size-[15px]" />
            </SidebarTrigger>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function SiteHeader(props: ComponentProps<'header'>) {
  return <Header {...props} />;
}

export function DocsHeader(props: ComponentProps<'header'>) {
  return <Header {...props} withSidebarTrigger />;
}
