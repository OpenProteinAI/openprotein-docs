import { NextResponse, type NextRequest } from 'next/server';

/**
 * Every URL the old Sphinx site served, moved to its new home with a 301.
 *
 * Sphinx mirrored the source tree with `.html` suffixes at the domain root, so 112 page URLs
 * (79 `.rst` + 33 `.ipynb`) become one suffix-stripping rule. Fragments never reach the server;
 * they survive because Phases 7 and 8 kept the ids.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts`.
 */

/** Pages that no longer exist. Both were `:orphan:` heading-only stubs. */
const RETIRED: Record<string, string> = {
  '/web-app/poet/designing-new-enzymes': '/web-app/poet',
  '/web-app/poet/substitutions-deletions': '/web-app/poet',
};

/** Renamed before the migration; the old site never shipped a redirect. */
const RENAMED: Record<string, string> = {
  '/web-app/opmodels/cluster': '/web-app/opmodels/cluster-sequences',
  '/web-app/opmodels/antibody-annotations': '/web-app/opmodels/antibody-annotation',
  '/web-app/opmodels/using-reference-sequence': '/web-app/opmodels/reference-sequence',
  '/walkthroughs/demo-datasets-page': '/resources/demo-datasets',
  '/rest-api/property-regression': '/rest-api/predictor',
  '/rest-api/poet': '/rest-api/embeddings',
};

/** Sphinx machinery with no counterpart here. */
const MACHINERY: Record<string, string> = {
  '/genindex': '/python-api/api-reference',
  '/py-modindex': '/python-api/api-reference',
  '/search': '/',
};

// `/404.html` needs no rule: stripping `.html` leaves `/404`, which has no page, so Next
// renders `app/not-found.tsx` — the right answer with the right status.

/** Generated artifacts nothing should still be asking for. */
const GONE = new Set(['/searchindex.js', '/objects.inv']);

function target(pathname: string): string | null {
  // viewcode's in-site copy of the SDK; `[source]` links now go to GitHub.
  if (pathname.startsWith('/_modules/')) return '/python-api/api-reference';

  const clean = pathname.endsWith('.html') ? pathname.slice(0, -'.html'.length) : pathname;
  if (clean === '/index') return '/';

  const route = clean.replace(/\/index$/, '');
  return (
    RETIRED[route] ??
    RENAMED[route] ??
    MACHINERY[clean] ??
    (clean === pathname ? null : route || '/')
  );
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (GONE.has(pathname)) return new NextResponse(null, { status: 404 });

  const to = target(pathname);
  if (!to || to === pathname) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = to;
  return NextResponse.redirect(url, 301);
}

export const config = {
  // `_static` passes through byte-identical, and `api` and `_next` must never be rewritten.
  matcher: ['/((?!_next/|_static/|api/).*)'],
};
