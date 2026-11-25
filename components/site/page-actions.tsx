import { ExternalLink, MessageSquare } from 'lucide-react';
import { EditPageLink } from '@/components/site/edit-page-link';
import { PageMenu } from '@/components/site/page-menu';
import { BASE_PATH } from '@/lib/base-path';
import { editUrl, FEEDBACK_URL, notebookUrl } from '@/lib/site';

const LINK =
  'flex w-fit items-center gap-2 text-xs text-fd-muted-foreground transition-colors hover:text-fd-primary';

/** The Markdown menu, for the TOC rail or a page's own header. */
export function PageMarkdownActions({
  path,
  url,
  align,
}: {
  /** The page's file under content/docs; a page built in code has none to edit. */
  path?: string;
  url: string;
  align?: 'start' | 'end';
}) {
  const markdownUrl =
    process.env.NEXT_PUBLIC_BUILD_TARGET === 'static' ? `${BASE_PATH}/md${url}.md` : `${url}.md`;

  return (
    <div className="flex">
      <PageMenu markdownUrl={markdownUrl} githubUrl={path ? editUrl(path) : undefined} align={align} />
    </div>
  );
}

export function PageActions({
  path,
  url,
  notebook,
}: {
  path: string;
  url: string;
  notebook?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <PageMarkdownActions path={path} url={url} />
      <EditPageLink url={url} className={LINK} />
      <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className={LINK}>
        <MessageSquare className="size-3.5" />
        Give feedback
      </a>
      {notebook ? (
        <a href={notebookUrl(notebook)} target="_blank" rel="noopener noreferrer" className={LINK}>
          <ExternalLink className="size-3.5" />
          Open in notebook
        </a>
      ) : null}
    </div>
  );
}
