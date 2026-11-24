import type { ReactNode } from 'react';
import { ModelNavLabel } from '@/components/models/nav-label';
import { DocsShell } from '@/components/site/docs-shell';
import { TreeFolder } from '@/components/site/mobile-nav';
import { getModelFamilyDocs, getSystemModels } from '@/lib/models';
import { withModelsSection } from '@/lib/models-tree';
import { source } from '@/lib/source';

/** Its own group, so only /models waits on the families: its sidebar is built from them. */
export default async function Layout({ children }: { children: ReactNode }) {
  const [families, models] = await Promise.all([getModelFamilyDocs(), getSystemModels()]);
  const tree = withModelsSection(source.getPageTree(), families, models ?? [], (view) => (
    <ModelNavLabel name={view.name} versions={view.versions.length} />
  ));

  return (
    <DocsShell tree={tree} sidebarClassName="op-models-sidebar" sidebarComponents={{ Folder: TreeFolder }}>
      {children}
    </DocsShell>
  );
}
