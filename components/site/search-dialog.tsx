'use client';

import { useMemo } from 'react';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogListItem,
  SearchDialogOverlay,
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { fetchClient } from 'fumadocs-core/search/client/fetch';
import type { SharedProps } from 'fumadocs-ui/contexts/search';
import { FileText, Hash, Terminal } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Result content is Markdown with <mark> around the matched terms. We render our own
 * row, so SearchDialogListItem's built-in markdown pass is bypassed - do it here.
 */
function highlight(content: ReactNode): ReactNode[] {
  if (typeof content !== 'string') return [content];
  return content.split(/<mark>|<\/mark>/).map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded bg-fd-primary/15 text-fd-primary">
        {part}
      </mark>
    ) : (
      part.replace(/\*\*/g, '')
    ),
  );
}

/** guide | endpoint | notebook | reference | page, from the page's own section. */
function kindOf(url: string) {
  if (url.startsWith('/rest-api')) return 'endpoint';
  if (url.startsWith('/python-api/api-reference')) return 'reference';
  if (url.startsWith('/walkthroughs')) return 'notebook';
  if (url.startsWith('/getting-started')) return 'guide';
  return 'page';
}

export function OpSearchDialog(props: SharedProps) {
  const client = useMemo(() => fetchClient({}), []);
  const { search, setSearch, query } = useDocsSearch({ client });
  const items = query.data !== 'empty' ? query.data : null;

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay className="backdrop-blur-[3px]" />
      <SearchDialogContent className="top-[12vh] max-w-[620px] translate-y-0 rounded-[0.75em]">
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput placeholder="Search the docs — models, endpoints, walkthroughs" />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList
          items={items}
          Empty={() => (
            <div className="px-3.5 py-6 text-center text-sm text-fd-muted-foreground">
              No matches. Try “assay”, “embeddings”, or “fold”.
            </div>
          )}
          Item={({ item, ...rest }) => {
            if (item.type === 'action')
              return <SearchDialogListItem item={item} {...rest} />;

            const Icon =
              item.type === 'heading' ? Hash : item.type === 'text' ? Terminal : FileText;
            return (
              <SearchDialogListItem
                item={item}
                {...rest}
                className="flex items-center gap-3 rounded-[9px] px-3 py-2.5"
              >
                <Icon className="size-[15px] shrink-0 text-fd-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-fd-foreground">
                    {highlight(item.content)}
                  </span>
                  {item.breadcrumbs?.length ? (
                    <span className="mt-0.5 block truncate text-xs text-fd-muted-foreground">
                      {item.breadcrumbs.join(' / ')}
                    </span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-xs text-fd-muted-foreground">
                  {kindOf(item.url)}
                </span>
              </SearchDialogListItem>
            );
          }}
        />
      </SearchDialogContent>
    </SearchDialog>
  );
}
