import { Download, ExternalLink, Play } from 'lucide-react';
import { SITE, notebookUrl } from '@/lib/site';

const PILL =
  'inline-flex items-center gap-1.5 rounded-full border border-fd-border bg-fd-card px-2.5 py-1 text-xs text-fd-muted-foreground transition-colors hover:border-fd-primary hover:text-fd-primary';

/** SITE.repo is the browse URL; Colab and raw.githubusercontent want the bare owner/name. */
const SLUG = SITE.repo.replace(/^https?:\/\/github\.com\//, '');

const ROOT = 'content/notebooks';

/** Matches lib/notebook's own normalisation so a page can pass either form. */
function normalize(file: string): string {
  const rel = file
    .replace(/^\.\//, '')
    .replace(/^content\/notebooks\//, '')
    .replace(/\.ipynb$/i, '');
  return `${rel}.ipynb`;
}

export function NotebookBadges({ file }: { file: string }) {
  const rel = normalize(file);

  // The badges committed in cell 0 point at the old source/ tree, which now 404s.
  const links = [
    {
      href: `https://colab.research.google.com/github/${SLUG}/blob/${SITE.branch}/${ROOT}/${rel}`,
      label: 'Open in Colab',
      Icon: Play,
    },
    {
      href: `https://raw.githubusercontent.com/${SLUG}/refs/heads/${SITE.branch}/${ROOT}/${rel}`,
      label: 'Download',
      Icon: Download,
    },
    { href: notebookUrl(rel), label: 'View on GitHub', Icon: ExternalLink },
  ];

  return (
    <div className="not-prose flex flex-wrap items-center gap-2">
      {links.map(({ href, label, Icon }) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" className={PILL}>
          <Icon className="size-3.5 shrink-0" />
          {label}
        </a>
      ))}
    </div>
  );
}
