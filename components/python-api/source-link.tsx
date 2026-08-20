import { ExternalLink } from 'lucide-react';
import { pySourceUrl, type PyDocument, type PySourceRef } from '@/lib/python-api';

/**
 * Replaces sphinx.ext.viewcode's in-site `_modules/**` copy of the SDK with a link to GitHub
 * at the exact tag the document was generated from. That removes a shadow copy of the SDK
 * from the docs site, names the commit, and works for inherited members too — which viewcode
 * did not, since the inherited definition lives in another module's page.
 */
export function SourceLink({
  document,
  source,
}: {
  document: PyDocument;
  source: PySourceRef | null;
}) {
  const href = pySourceUrl(document, source);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`${source?.file}:${source?.line}`}
      className="not-prose ms-auto inline-flex shrink-0 items-center gap-1 text-xs text-fd-muted-foreground transition-colors hover:text-fd-primary"
    >
      source
      <ExternalLink aria-hidden className="size-3" />
    </a>
  );
}
