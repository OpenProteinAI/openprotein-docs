'use client';

import { usePathname } from 'next/navigation';
import { useMemo, type ComponentProps, type ReactNode } from 'react';
import type { Folder, Node } from 'fumadocs-core/page-tree';
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  SidebarSeparator,
  useFolder,
  useFolderDepth,
} from 'fumadocs-ui/components/sidebar/base';
import { useTreeContext, useTreePath } from 'fumadocs-ui/contexts/tree';
import { cn } from '@/lib/cn';
import { isVersionsFolder } from '@/lib/models-tree';
import { SECTIONS } from '@/lib/sections';

// fumadocs-ui 16.14.3's notebook sidebar items, which it keeps private. Re-copy after a bump.
const ITEM =
  'relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0';
const HOVER =
  'transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 hover:transition-none';
const LINK = `${HOVER} data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary data-[active=true]:hover:transition-colors`;
const RULE =
  "data-[active=true]:before:content-[''] data-[active=true]:before:bg-fd-primary data-[active=true]:before:absolute data-[active=true]:before:w-px data-[active=true]:before:inset-y-2.5 data-[active=true]:before:inset-s-2.5";
const FOLDER_RULE =
  "before:absolute before:inset-y-1 before:inset-s-2.5 before:w-px before:bg-fd-border before:content-['']";
const SEPARATOR =
  'mt-6 mb-1.5 inline-flex items-center gap-2 px-2 empty:mb-0 [&_svg]:size-4 [&_svg]:shrink-0';

const indent = (depth: number) => ({
  paddingInlineStart: `calc(${2 + 3 * depth} * var(--spacing))`,
});

// trailingSlash is on for the static export, and the tree's urls carry none.
const isActive = (url: string, pathname: string) =>
  url.replace(/\/$/, '') === pathname.replace(/\/$/, '');

function Item({ className, ...props }: ComponentProps<typeof SidebarItem>) {
  const depth = useFolderDepth();
  return (
    <SidebarItem
      className={cn(ITEM, LINK, depth >= 1 && RULE, className)}
      style={indent(depth)}
      {...props}
    />
  );
}

function FolderLink({ className, ...props }: ComponentProps<typeof SidebarFolderLink>) {
  const depth = useFolderDepth();
  return (
    <SidebarFolderLink
      className={cn(ITEM, LINK, depth > 1 && RULE, 'w-full', className)}
      style={indent(depth - 1)}
      {...props}
    />
  );
}

function FolderTrigger({ className, ...props }: ComponentProps<typeof SidebarFolderTrigger>) {
  const folder = useFolder();
  return (
    <SidebarFolderTrigger
      className={cn(ITEM, folder?.collapsible && HOVER, 'w-full', className)}
      style={indent((folder?.depth ?? 1) - 1)}
      {...props}
    />
  );
}

function FolderContent({
  className,
  children,
  ...props
}: ComponentProps<typeof SidebarFolderContent>) {
  const depth = useFolderDepth();
  return (
    <SidebarFolderContent className={cn('relative', depth === 1 && FOLDER_RULE, className)} {...props}>
      <div className="flex flex-col gap-0.5 pt-0.5">{children}</div>
    </SidebarFolderContent>
  );
}

/** A folder, collapsed unless the page is inside it. `href` lets a section put its own url on it. */
function Group({ folder, href, children }: { folder: Folder; href?: string; children: ReactNode }) {
  const pathname = usePathname();
  const path = useTreePath();
  const url = href ?? folder.index?.url;

  return (
    <SidebarFolder
      collapsible={folder.collapsible}
      defaultOpen={folder.defaultOpen}
      active={path.includes(folder)}
    >
      {url ? (
        <FolderLink href={url} active={folder.index ? isActive(folder.index.url, pathname) : false}>
          {children}
        </FolderLink>
      ) : (
        <FolderTrigger>{children}</FolderTrigger>
      )}
      <FolderContent>
        {folder.children.map((node, i) => (
          <TreeNode key={node.$id ?? i} node={node} />
        ))}
      </FolderContent>
    </SidebarFolder>
  );
}

/** A base model's folder: one entry, active on any of its versions' pages. */
function VersionsFolder({ folder }: { folder: Folder }) {
  const path = useTreePath();
  return (
    <Item href={folder.index?.url ?? ''} active={path.includes(folder)} icon={folder.icon}>
      {folder.name}
    </Item>
  );
}

/** The desktop sidebar's folders, as this menu draws them. */
export function TreeFolder({ item }: { item: Folder; children: ReactNode }) {
  if (isVersionsFolder(item)) return <VersionsFolder folder={item} />;
  return (
    <Group folder={item}>
      {item.icon}
      {item.name}
    </Group>
  );
}

function TreeNode({ node }: { node: Node }) {
  const pathname = usePathname();
  const depth = useFolderDepth();

  if (node.type === 'separator') {
    return (
      <SidebarSeparator className={SEPARATOR} style={indent(depth)}>
        {node.icon}
        {node.name}
      </SidebarSeparator>
    );
  }
  if (node.type === 'folder' && isVersionsFolder(node)) return <VersionsFolder folder={node} />;
  if (node.type === 'folder') {
    return (
      <Group folder={node}>
        {node.icon}
        {node.name}
      </Group>
    );
  }
  return (
    <Item
      href={node.url}
      external={node.external}
      active={isActive(node.url, pathname)}
      icon={node.icon}
    >
      {node.name}
    </Item>
  );
}

/** The outermost folder whose pages all live at or under `urls`: the folder a section stands for. */
function folderAt(nodes: Node[], urls: readonly string[]): Folder | undefined {
  const under = (page: string) => urls.some((url) => page === url || page.startsWith(`${url}/`));
  const pages = (folder: Folder): string[] => [
    ...(folder.index ? [folder.index.url] : []),
    ...folder.children.flatMap((node) =>
      node.type === 'folder' ? pages(node) : node.type === 'page' ? [node.url] : [],
    ),
  ];

  for (const node of nodes) {
    if (node.type !== 'folder') continue;
    const inside = pages(node);
    if (inside.length > 0 && inside.every(under)) return node;
    const inner = folderAt(node.children, urls);
    if (inner) return inner;
  }
}

/** The header's sections for below lg, each folding its pages under it. See the op-docs-styling
 *  skill, references/surfaces.md. */
export function MobileNav() {
  const pathname = usePathname();
  const path = useTreePath();
  const { root, full } = useTreeContext();
  const folders = useMemo(
    () =>
      SECTIONS.map((section) => folderAt(full.children, [section.url, ...(section.also ?? [])])),
    [full],
  );
  // The root:true folder the page sits in, listed last when no section holds it.
  const current = root.type === 'folder' ? (root as Folder) : undefined;
  const held = SECTIONS.some((section, i) => {
    const folder = folders[i];
    return folder ? path.includes(folder) : isActive(section.url, pathname);
  });

  return (
    <div data-mobile-nav className="flex flex-col gap-0.5">
      {SECTIONS.map((section, i) => {
        const folder = folders[i];
        return folder ? (
          <Group key={section.url} folder={folder} href={section.url}>
            {section.text}
          </Group>
        ) : (
          <Item key={section.url} href={section.url} active={isActive(section.url, pathname)}>
            {section.text}
          </Item>
        );
      })}
      {current && !held ? <Group folder={current}>{current.name}</Group> : null}
    </div>
  );
}
