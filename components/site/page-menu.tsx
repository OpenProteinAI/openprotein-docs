'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, ExternalLink, Text, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from 'fumadocs-ui/components/ui/popover';
import { Button } from '@/components/site/button';

type Status = 'idle' | 'copied' | 'failed';

const cache = new Map<string, Promise<string>>();

function fetchMarkdown(url: string) {
  let text = cache.get(url);
  if (!text) {
    text = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res.text();
    });
    cache.set(url, text);
    text.catch(() => cache.delete(url));
  }
  return text;
}

async function copyMarkdown(url: string) {
  const text = fetchMarkdown(url);
  // Keeps Safari's user activation.
  if (typeof ClipboardItem !== 'undefined') {
    await navigator.clipboard.write([new ClipboardItem({ 'text/plain': text })]);
  } else {
    await navigator.clipboard.writeText(await text);
  }
}

const ITEM =
  'op-menu-item hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:bg-fd-accent focus-visible:text-fd-accent-foreground focus-visible:outline-none';
const TRAILING = 'ms-auto size-3! text-fd-muted-foreground';

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** One menu for a page's Markdown: copy it, view it, or open its source. */
export function PageMenu({
  markdownUrl,
  githubUrl,
  align = 'start',
}: {
  markdownUrl: string;
  githubUrl?: string;
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const timer = setTimeout(() => setOpen(false), status === 'copied' ? 700 : 1600);
    return () => clearTimeout(timer);
  }, [status]);

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setStatus('idle');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="compact"
          className="text-xs data-[state=open]:bg-[var(--btn-outline-active)]"
        >
          Markdown
          <ChevronDown className="size-3.5 text-fd-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} sideOffset={6} className="flex min-w-0 flex-col p-1">
        <button
          type="button"
          className={ITEM}
          onClick={() => {
            copyMarkdown(markdownUrl).then(
              () => setStatus('copied'),
              () => setStatus('failed'),
            );
          }}
        >
          {status === 'copied' ? <Check /> : status === 'failed' ? <X /> : <Copy />}
          <span aria-live="polite">
            {status === 'copied' ? 'Copied' : status === 'failed' ? 'Copy failed' : 'Copy Markdown'}
          </span>
        </button>
        <a href={markdownUrl} target="_blank" rel="noopener noreferrer" className={ITEM}>
          <Text />
          <span>View as Markdown</span>
          <ExternalLink className={TRAILING} />
        </a>
        {githubUrl ? (
          <>
            <div role="separator" className="mx-2 my-1 border-t border-fd-border" />
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" className={ITEM}>
              <GitHubIcon />
              <span>Open in GitHub</span>
              <ExternalLink className={TRAILING} />
            </a>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
