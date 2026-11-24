import type { ComponentProps, ReactNode } from 'react';
import type { Root } from 'fumadocs-core/page-tree';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { DocsHeader } from '@/components/site/header';
import { MobileNav } from '@/components/site/mobile-nav';
import { baseOptions } from '@/lib/layout.shared';

/** notebook, not layouts/docs: layouts/docs folds the nav into the sidebar. */
export function DocsShell({
  tree,
  sidebarClassName,
  sidebarComponents,
  children,
}: {
  tree: Root;
  /** Marks the sidebar of a section that styles its tree differently. */
  sidebarClassName?: string;
  /** A section's own renderers for its tree's nodes. */
  sidebarComponents?: NonNullable<ComponentProps<typeof DocsLayout>['sidebar']>['components'];
  children: ReactNode;
}) {
  const { nav, ...rest } = baseOptions();

  return (
    <DocsLayout
      {...rest}
      tree={tree}
      nav={{ ...nav, mode: 'top' }}
      tabMode="navbar"
      // Each section's meta.json is `root: true`, so the sidebar shows only the section you are
      // in. That would also auto-derive layout tabs, which the header pills already are.
      tabs={false}
      slots={{ header: DocsHeader }}
      // Below lg, where the header pills hide, MobileNav stands in for the sidebar's page tree.
      links={[{ type: 'custom', on: 'menu', children: <MobileNav /> }]}
      // No desktop collapse trigger, so don't advertise collapsing. The mobile
      // hamburger in the header is a separate trigger and still works.
      sidebar={{ collapsible: false, className: sidebarClassName, components: sidebarComponents }}
    >
      {children}
    </DocsLayout>
  );
}
