import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

interface Payload {
  mdx: string;
}

/** The `?data=` value; same scheme as the app's compressToUri. */
export function encodeDoc(mdx: string): string {
  return compressToEncodedURIComponent(JSON.stringify({ mdx } satisfies Payload));
}

export function decodeDoc(data: string | null): string | null {
  if (!data) return null;
  try {
    const json = decompressFromEncodedURIComponent(data);
    const value: unknown = json ? JSON.parse(json) : null;
    const mdx = (value as Partial<Payload> | null)?.mdx;
    return typeof mdx === 'string' ? mdx : null;
  } catch {
    return null;
  }
}

export type ViewMode = 'split' | 'write' | 'preview';

/** This page's URL carrying the mode and `mdx`; split and an empty doc are the defaults, left out. */
export function shareUrl(mdx: string | null, view: ViewMode = 'split'): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  if (view !== 'split') url.searchParams.set('mode', view);
  if (mdx) url.searchParams.set('data', encodeDoc(mdx));
  return url.toString();
}

export function readSharedView(): ViewMode | null {
  const view = new URLSearchParams(window.location.search).get('mode');
  return view === 'split' || view === 'write' || view === 'preview' ? view : null;
}

export function readSharedDoc(): string | null {
  return decodeDoc(new URLSearchParams(window.location.search).get('data'));
}
