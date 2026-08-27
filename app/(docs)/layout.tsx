import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
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
      // Each section's meta.json is `root: true`, so the sidebar shows only the section you are
      // in. That would also auto-derive layout tabs, which the header pills already are.
      tabs={false}
      slots={{ header: DocsHeader }}
      // No desktop collapse trigger, so don't advertise collapsing. The mobile
      // hamburger in the header is a separate trigger and still works.
      sidebar={{ collapsible: false }}
    >
      {children}
    </DocsLayout>
  );
}
