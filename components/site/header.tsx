'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentProps } from 'react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from 'fumadocs-ui/components/ui/navigation-menu';
import { FullSearchTrigger, SearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { SidebarTrigger } from 'fumadocs-ui/layouts/notebook/slots/sidebar';
import { Menu } from 'lucide-react';
import { SessionMenu } from '@/components/auth/session-menu';
import { useSession } from '@/components/auth/session-provider';
import { Button } from '@/components/site/button';
import { Logo } from '@/components/site/logo';
import { ThemeToggle } from '@/components/site/theme-toggle';
import { SECTIONS } from '@/lib/sections';
import { signIn } from '@/lib/auth/session';

// The layout grid's header; z-30 beats the sidebar's z-20.
const SHELL =
  'sticky [grid-area:header] flex flex-col top-[var(--fd-docs-row-1,0rem)] z-30 backdrop-blur-[14px] transition-colors data-[transparent=false]:bg-fd-background/88 layout:[--fd-header-height:3.75rem]';

const MENU_BUTTON =
  'flex size-8 shrink-0 items-center justify-center rounded-[0.75em] border border-fd-border text-fd-muted-foreground lg:hidden';

interface Props extends ComponentProps<'header'> {
  /** Docs only: needs SidebarContext. */
  withSidebarTrigger?: boolean;
}

function Header({ className, withSidebarTrigger, ...props }: Props) {
  const pathname = usePathname();
  const session = useSession();
  // Longest match wins; `also` urls count for their section.
  const activeUrl = SECTIONS.flatMap((section) =>
    [section.url, ...(section.also ?? [])].map((url) => ({ url, section: section.url })),
  )
    .filter(({ url }) => pathname === url || pathname.startsWith(`${url}/`))
    .sort((a, b) => b.url.length - a.url.length)[0]?.section;

  const Shell = withSidebarTrigger ? 'header' : MenuShell;

  return (
    <Shell
      id="nd-subnav"
      data-transparent="false"
      {...props}
      className={[SHELL, className].filter(Boolean).join(' ')}
    >
      <div
        data-header-body
        className="mx-auto flex py-2 w-full max-w-(--fd-layout-width) items-center px-4"
      >
        {/* From the nav breakpoint (92.5rem), spans the sidebar column. */}
        <Link
          href="/"
          className="flex shrink-0 items-center nav:w-[calc(var(--fd-sidebar-width)-1rem)]"
        >
          <Logo size="sm" responsive />
        </Link>

        {/* From the nav breakpoint (92.5rem), the first pill's text lines up with the article. */}
        <nav className="ms-5 hidden min-w-0 flex-1 items-center gap-0.5 overflow-hidden lg:flex nav:ms-[calc(2rem-0.5rem)]">
          {SECTIONS.map((section) => (
            <Link
              key={section.url}
              href={section.url}
              data-active={section.url === activeUrl}
              className="rounded-lg px-2 py-1.5 text-sm font-normal whitespace-nowrap text-fd-foreground transition-colors data-[active=false]:hover:bg-fd-muted data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary"
            >
              {section.text}
            </Link>
          ))}
        </nav>

        <div className="ms-5 flex flex-1 items-center justify-end gap-2 lg:flex-none">
          {/* The box fits beside the pills from 81.25rem. */}
          <FullSearchTrigger
            hideIfDisabled
            className="hidden h-8 w-[13.125rem] rounded-[0.75em] border border-fd-border bg-fd-background text-sm text-fd-muted-foreground min-[81.25rem]:flex"
          />
          <SearchTrigger hideIfDisabled className="min-[81.25rem]:hidden" />
          <ThemeToggle />
          {session.status === 'signed-out' ? (
            <Button variant="main" onClick={signIn}>
              Log in
            </Button>
          ) : session.status === 'signed-in' ? (
            <SessionMenu />
          ) : null}
          {withSidebarTrigger ? (
            <SidebarTrigger className={MENU_BUTTON}>
              <Menu className="size-[0.9375rem]" />
            </SidebarTrigger>
          ) : (
            <SectionsMenu activeUrl={activeUrl} />
          )}
        </div>
      </div>
    </Shell>
  );
}

/** HomeLayout's header is the NavigationMenu root; the panel overlays the page. */
function MenuShell({ className, children, ...props }: ComponentProps<'header'>) {
  return (
    <NavigationMenu asChild>
      <header {...props} className={className}>
        <NavigationMenuList asChild>{children}</NavigationMenuList>
        <div className="absolute inset-x-0 top-full">
          <NavigationMenuViewport className="border-b border-fd-border bg-fd-background shadow-lg" />
        </div>
      </header>
    </NavigationMenu>
  );
}

/** The pills' sections below lg. */
function SectionsMenu({ activeUrl }: { activeUrl?: string }) {
  return (
    <NavigationMenuItem asChild>
      <div className="lg:hidden">
        <NavigationMenuTrigger
          aria-label="Toggle Menu"
          className={MENU_BUTTON}
          // Tap only, not hover.
          onPointerMove={(event) => event.preventDefault()}
        >
          <Menu className="size-[0.9375rem]" />
        </NavigationMenuTrigger>
        <NavigationMenuContent className="flex flex-col p-4">
          {SECTIONS.map((section) => (
            <NavigationMenuLink key={section.url} asChild>
              <Link
                href={section.url}
                data-active={section.url === activeUrl}
                className="py-1.5 transition-colors hover:text-fd-popover-foreground/50 data-[active=true]:font-medium data-[active=true]:text-fd-primary"
              >
                {section.text}
              </Link>
            </NavigationMenuLink>
          ))}
        </NavigationMenuContent>
      </div>
    </NavigationMenuItem>
  );
}

export function SiteHeader(props: ComponentProps<'header'>) {
  return <Header {...props} />;
}

export function DocsHeader(props: ComponentProps<'header'>) {
  return <Header {...props} withSidebarTrigger />;
}
