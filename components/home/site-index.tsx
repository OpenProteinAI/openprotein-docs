import type { ReactNode } from 'react';
import Link from 'next/link';
import type { Folder, Item, Node } from 'fumadocs-core/page-tree';
import { source } from '@/lib/source';
import { cn } from '@/lib/cn';
import { HOVER_LINK } from '@/lib/link';

/** The pages that exist, read off the page tree, so it cannot drift from the sidebar. A section
 *  is a full-width row over its own columns: they run from 1 page to 45. */

interface Leaf {
  key: string;
  name: ReactNode;
  url?: string;
}

interface Entry extends Leaf {
  children?: Leaf[];
}

interface Section extends Leaf {
  /** '/tutorials' — what an orphaned page's first segment is matched against. */
  prefix?: string;
  /** Built for a folder the root meta.json does not list, so its name comes from its own page. */
  synthetic?: boolean;
  entries: Entry[];
}

const isFolder = (node: Node): node is Folder => node.type === 'folder';
const isPage = (node: Node): node is Item => node.type === 'page';
const segment = (url: string, index: number): string | undefined =>
  url.split('/')[index] || undefined;
const titleCase = (slug: string): string =>
  slug.replace(/[-_]/g, ' ').replace(/(^|\s)\w/g, (char) => char.toUpperCase());

/** Every page is listed once. A folder's index page is reachable both as `folder.index` and as
 *  a child of that folder, and the two are not the same object, so the url dedupes them. */
function collector() {
  const seen = new Set<string>();
  return {
    seen,
    take(page: Item | undefined): Leaf | undefined {
      if (!page || seen.has(page.url)) return undefined;
      seen.add(page.url);
      return { key: page.url, name: page.name, url: page.url };
    },
  };
}

/** Pages below a folder, including any deeper folder's, so nothing is silently dropped. */
function pagesUnder(nodes: Node[]): Item[] {
  return nodes.flatMap((node) => {
    if (isPage(node)) return [node];
    if (!isFolder(node)) return [];
    return [...(node.index ? [node.index] : []), ...pagesUnder(node.children)];
  });
}

function buildSections(): Section[] {
  const { seen, take } = collector();

  const sections = source
    .getPageTree()
    .children.filter(isFolder)
    .map((folder): Section => {
      const first = folder.index ?? pagesUnder(folder.children)[0];
      // The index page titles the section rather than repeating as the first entry under it.
      const index = take(folder.index);

      return {
        key: folder.$id ?? first?.url ?? String(folder.name),
        name: folder.name,
        url: index?.url,
        prefix: first ? `/${segment(first.url, 1)}` : undefined,
        entries: folder.children.flatMap((node): Entry[] => {
          if (isPage(node)) {
            const page = take(node);
            return page ? [page] : [];
          }
          if (!isFolder(node)) return [];

          // Same promotion one level down: a subfolder's own page is its link, not its first
          // child, where it repeats the folder name verbatim ("PoET" under "PoET").
          const pages = pagesUnder(node.children);
          const base = pages[0]?.url.split('/').slice(0, 3).join('/');
          const self = take(node.index ?? pages.find((page) => page.url === base));

          return [
            {
              key: node.$id ?? self?.url ?? String(node.name),
              name: node.name,
              url: self?.url,
              children: pages.flatMap((page) => {
                const child = take(page);
                return child ? [child] : [];
              }),
            },
          ];
        }),
      };
    });

  // Pages that exist but that no meta.json lists, so the tree — and the sidebar — never sees them.
  // The site serves them, so a list of every page owes them an entry.
  for (const page of source.getPages()) {
    if (seen.has(page.url)) continue;
    const prefix = `/${segment(page.url, 1)}`;
    let section = sections.find((candidate) => candidate.prefix === prefix);
    if (!section) {
      // A whole folder the root meta.json does not list: no section exists to hang it off, and
      // dropping it would leave a page the site serves out of the list of every page.
      section = { key: prefix, name: titleCase(prefix.slice(1)), prefix, synthetic: true, entries: [] };
      sections.push(section);
    }

    seen.add(page.url);
    const item: Leaf = { key: page.url, name: page.data.title, url: page.url };
    const group = segment(page.url, 3) && segment(page.url, 2);
    if (!group) {
      section.entries.push(item);
      continue;
    }

    const parent = section.entries.find((entry) => entry.key === `orphans:${group}`);
    if (parent) parent.children?.push(item);
    else
      section.entries.push({
        key: `orphans:${group}`,
        name: group.charAt(0).toUpperCase() + group.slice(1),
        children: [item],
      });
  }

  // A section's overview page titles the section rather than sitting under it, where its title
  // reads as a sentence beside nav labels. `folder.index` is unset: meta.json lists it as a page.
  for (const section of sections) {
    if (section.url) continue;
    const overview = section.entries.findIndex((entry) => entry.url === section.prefix);
    if (overview === -1) continue;
    const [page] = section.entries.splice(overview, 1);
    section.url = page.url;
    if (section.synthetic) section.name = page.name;
  }

  return sections;
}

const COLUMNS = 'columns-1 gap-10 sm:columns-2 lg:columns-3 xl:columns-4';

const height = (run: Entry[]): number =>
  run.reduce((sum, entry) => sum + 1 + (entry.children?.length ?? 0), 0);

/** Splits entries, in order, into `count` runs of even height. */
function stacks(entries: Entry[], count: number): Entry[][] {
  const runs = Math.min(count, entries.length);
  if (runs <= 1) return entries.length > 0 ? [entries] : [];

  let best: Entry[][] = [];
  let cost = Infinity;
  for (let cut = 1; cut <= entries.length - runs + 1; cut++) {
    const split = [entries.slice(0, cut), ...stacks(entries.slice(cut), runs - 1)];
    const total = split.reduce((sum, run) => sum + height(run) ** 2, 0);
    // Ties go to the later cut, which fills earlier columns first, as balancing does.
    if (total <= cost) [best, cost] = [split, total];
  }
  return best;
}

/** A section's only entry has no neighbours to share the columns with, so its pages take them. */
const lone = (section: Section): boolean => section.entries.length === 1;

function Label({ item, className }: { item: Leaf; className?: string }) {
  if (!item.url) return <>{item.name}</>;
  return (
    <Link href={item.url} className={className}>
      {item.name}
    </Link>
  );
}

export function SiteIndex() {
  const sections = buildSections();

  return (
    <section className="pt-10 pb-12">
      <h2 className="mb-6 text-2xl font-semibold tracking-tight text-fd-foreground">Sitemap</h2>

      <div className="flex flex-col gap-8">
        {sections.map((section) => (
          <div key={section.key}>
            {/* A section with no pages under it drops the rule, which would underline nothing. */}
            <h3
              className={cn(
                'text-2xs font-semibold tracking-caps text-fd-muted-foreground uppercase',
                section.entries.length > 0 && 'mb-3 border-b border-fd-border pb-2',
              )}
            >
              <Label item={section} className="hover:text-fd-foreground" />
            </h3>

            {/* Balancing leaves columns empty beside one tall group, so xl places the runs itself. */}
            <div className={cn(COLUMNS, !lone(section) && 'xl:grid xl:grid-cols-4')}>
              {stacks(section.entries, 4).map((stack) => (
                <ul key={stack[0].key}>
                  {stack.map((entry) => (
                    <li
                      key={entry.key}
                      className={cn(
                        'mb-2 text-fd-foreground',
                        lone(section) ? '[column-span:all]' : 'break-inside-avoid',
                      )}
                    >
                      <div className="mb-1">
                        <Label item={entry} className={HOVER_LINK} />
                      </div>

                      {entry.children && entry.children.length > 0 && (
                        <ul
                          className={cn(
                            'pl-4 text-fd-muted-foreground',
                            lone(section)
                              ? cn(COLUMNS, '[&>li]:mb-1 [&>li]:break-inside-avoid')
                              : 'flex flex-col gap-1',
                          )}
                        >
                          {entry.children.map((child) => (
                            <li key={child.key}>
                              <Label item={child} className={HOVER_LINK} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
