import { withBase } from '@/lib/base-path';

const path = (url: string) => url.split('/').map(encodeURIComponent).join('/');

/** The editor, opened on a docs page's source. */
export function editPageHref(url: string): string {
  return `/editor?page=${path(url)}`;
}

/** `?page=` as a docs URL; null when absent or unsafe. */
export function readSharedPage(): string | null {
  const page = new URLSearchParams(window.location.search).get('page')?.replace(/\/+$/, '');
  if (!page?.startsWith('/')) return null;
  const segments = page.slice(1).split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return null;
  return page;
}

/** The build-time JSON holding a page's MDX source. */
export function pageSourceUrl(page: string): string {
  return withBase(`/editor/source${path(page)}.json`);
}
