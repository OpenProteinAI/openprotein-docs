import { Download, ExternalLink, Play } from 'lucide-react';
import { Button } from '@/components/site/button';
import { REPO_SLUG, SITE, notebookUrl } from '@/lib/site';

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

  const links = [
    {
      href: `https://colab.research.google.com/github/${REPO_SLUG}/blob/${SITE.ref}/content/notebooks/${rel}`,
      label: 'Open in Colab',
      Icon: Play,
      external: true,
    },
    // Served from our own origin: the exact file we render, with no dependency on a push.
    {
      href: `/api/notebook?file=${encodeURIComponent(rel)}`,
      label: 'Download',
      Icon: Download,
      external: false,
    },
    { href: notebookUrl(rel), label: 'View on GitHub', Icon: ExternalLink, external: true },
  ];

  return (
    <div className="not-prose flex flex-wrap items-center gap-2">
      {links.map(({ href, label, Icon, external }) => (
        <Button
          key={label}
          variant="secondary"
          size="compact"
          href={href}
          external={external}
          className="text-xs"
          {...(external ? {} : { download: rel.split('/').pop() })}
        >
          <Icon className="size-3.5 shrink-0" />
          {label}
        </Button>
      ))}
    </div>
  );
}
