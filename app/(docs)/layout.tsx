import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { FullSearchTrigger } from 'fumadocs-ui/layouts/shared/slots/search-trigger';
import { SidebarCollapseTrigger } from 'fumadocs-ui/layouts/notebook/slots/sidebar';
import { PanelLeft } from 'lucide-react';
import { DocsHeader } from '@/components/site/header';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

/** notebook, not layouts/docs: layouts/docs folds the nav into the sidebar. */
export default function Layout({ children }: { children: ReactNode }) {
  const { nav, ...rest } = baseOptions();

  return (
    <DocsLayout
      {...rest}
      tree={source.getPageTree()}
      nav={{ ...nav, mode: 'top' }}
      tabMode="navbar"
      slots={{ header: DocsHeader }}
      sidebar={{
        // One row, as in the MVP.
        banner: (
          <div className="flex items-center gap-2">
            <FullSearchTrigger className="h-[34px] flex-1 rounded-[0.75em] border border-fd-border bg-fd-muted text-sm text-fd-muted-foreground" />
            <SidebarCollapseTrigger className="flex size-[34px] shrink-0 items-center justify-center rounded-[0.75em] text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground max-lg:hidden">
              <PanelLeft className="size-[15px]" />
            </SidebarCollapseTrigger>
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
