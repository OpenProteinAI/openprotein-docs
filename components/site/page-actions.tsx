import { ExternalLink, MessageSquare, Pencil } from 'lucide-react';
import { editUrl, notebookUrl, SITE } from '@/lib/site';

const LINK =
  'flex items-center gap-2 text-xs text-fd-muted-foreground transition-colors hover:text-fd-primary';

export function PageActions({ path, notebook }: { path: string; notebook?: string }) {
  return (
    <div className="flex flex-col gap-2.5 border-t border-fd-border pt-4.5">
      <a href={editUrl(path)} target="_blank" rel="noreferrer" className={LINK}>
        <Pencil className="size-3.5" />
        Edit this page
      </a>
      <a href={SITE.feedback} target="_blank" rel="noreferrer" className={LINK}>
        <MessageSquare className="size-3.5" />
        Give feedback
      </a>
      {notebook ? (
        <a href={notebookUrl(notebook)} target="_blank" rel="noreferrer" className={LINK}>
          <ExternalLink className="size-3.5" />
          Open in notebook
        </a>
      ) : null}
    </div>
  );
}
