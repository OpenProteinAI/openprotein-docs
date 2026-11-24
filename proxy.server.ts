import { NextResponse, type NextRequest } from 'next/server';
import { PY_API_URL, REST_API_URL } from '@/lib/site';

/**
 * Old URLs, moved to their new home with a 301: the Sphinx site's, and this site's own from
 * before the October 2026 restructure.
 *
 * Sphinx mirrored the source tree with `.html` suffixes at the domain root, so its page URLs
 * become one suffix-stripping rule, then go through the restructure's moves like any other URL.
 * This is page-level only: fragments never reach the server, and old-site fragments are no
 * longer a compatibility target — heading text is free to change.
 *
 * Under `pnpm dev` with `OP_SERVER_PROXY` set, it also proxies `/api/v1/*` to the platform API.
 *
 * Next 16 renamed `middleware.ts` to `proxy.ts`.
 */

/** Renamed before the migration; the old site never shipped a redirect. */
const RENAMED: Record<string, string> = {
  '/walkthroughs/demo-datasets-page': '/resources/demo-datasets',
  '/rest-api/property-regression': '/rest-api/predictor',
  '/rest-api/poet': '/rest-api/embeddings',
};

/** Sphinx machinery with no counterpart here. */
const MACHINERY: Record<string, string> = {
  '/genindex': PY_API_URL,
  '/py-modindex': PY_API_URL,
  '/search': '/',
};

/** The October 2026 restructure. EXACT wins, then MOVED keeps the rest of the path and checks EXACT again, then
 *  everything under a DELETED section lands on its nearest new home. */
const EXACT: Record<string, string> = {
  '/walkthroughs': '/tutorials',
  '/python-api': PY_API_URL,
  '/python-api/installation': '/quickstart',
  '/python-api/quickstart': '/quickstart',
  '/quickstart/quickstart': '/quickstart',
  '/resources/glossary': '/concepts',
  '/resources/tutorials-examples': '/tutorials',
  // A folder with no index page of its own; /tutorials lists the walkthroughs.
  '/tutorials/walkthroughs': '/tutorials',
  // Deleted; the how-to covers aligning sequences.
  '/tutorials/datasets/sequence/aligning-variable': '/how-tos/dataset/align-sequences',
  '/concepts/protein': '/concepts/proteins/proteins',
  '/concepts/jobs': '/concepts/jobs/jobs',
  '/how-tos/upload-assay': '/how-tos/dataset/upload-assay',
  '/how-tos/align-sequences': '/how-tos/dataset/align-sequences',
  '/how-tos/predict/inverse-folding': '/how-tos/design/inverse-folding',
  '/tutorials/datasets/design/inverse-folding': '/tutorials/design/generate/inverse-folding',
  '/tutorials/datasets/design/PoET-2_inverse_folding': '/tutorials/design/generate/PoET-2_inverse_folding',
  '/tutorials/design/zero-shot/enzyme-engineering': '/tutorials/predict/plm/one-shot-variant-library',
  '/tutorials/select/antibody-hit-selection-ngs': '/how-tos/select/antibody-hit-selection-ngs',
  '/how-tos/substitution-analysis': '/how-tos/predict/substitutions',
  '/how-tos/design-a-combinatorial-library': '/how-tos/design/design-a-combinatorial-library',
  // Walkthroughs, moved again after the restructure.
  '/tutorials/walkthroughs/AMIE_substitution_deletion_analysis_poet': '/tutorials/predict/plm/substitution-indels-compare',
  '/tutorials/walkthroughs/Embedding_and_visualizing_antibodies': '/tutorials/analyze/Embedding_and_visualizing_antibodies',
  '/tutorials/walkthroughs/Nanobody_binder_design_with_BoltzGen': '/tutorials/design/generate/boltzgen',
  '/tutorials/walkthroughs/nanobody_binder_design_with_boltzgen_using_the_gui': '/tutorials/design/generate/boltzgen',
  '/tutorials/walkthroughs/PoET-2_inverse_folding': '/tutorials/design/generate/PoET-2_inverse_folding',
  '/tutorials/walkthroughs/PoET_api_insertion_screen_nuclear_localization': '/tutorials/predict/plm/indels-python',
  '/tutorials/walkthroughs/Protein_protein_binder_design_with_RFdiffusion': '/tutorials/design/generate/rfdiffusion',
  '/tutorials/walkthroughs/protein_protein_binder_design_with_rfdiffusion_using_the_GUI': '/tutorials/design/generate/rfdiffusion',
  '/tutorials/walkthroughs/aligning-variable': '/how-tos/dataset/align-sequences',
  '/tutorials/walkthroughs/antibody-engineering': '/tutorials/design/active-learning/antibody-engineering',
  '/tutorials/walkthroughs/antibody-hit-selection-ngs': '/how-tos/select/antibody-hit-selection-ngs',
  '/tutorials/walkthroughs/enzyme-engineering': '/tutorials/predict/plm/one-shot-variant-library',
  '/tutorials/walkthroughs/multichain': '/tutorials/design/active-learning/multichain',
  '/tutorials/walkthroughs/predicting-fitness': '/tutorials/predict/plm/zero-shot-fitness',
  '/tutorials/walkthroughs/quantitative-decision-making-library-design':
    '/tutorials/design/active-learning/quantitative-decision-making-library-design',
  // Deleted.
  '/references/resources/publications': '/references',
};

const MOVED: [from: string, to: string][] = [
  ['/python-api/api-reference', PY_API_URL],
  ['/rest-api', REST_API_URL],
  ['/walkthroughs', '/tutorials/walkthroughs'],
  ['/resources/faq', '/references/resources/faq'],
  ['/resources/publications', '/references/resources/publications'],
  ['/resources/demo-datasets', '/references/resources/demo-datasets'],
  ['/reference', '/references'],
  ['/references/demo-datasets', '/references/resources/demo-datasets'],
  ['/references/faq', '/references/resources/faq'],
  ['/references/publications', '/references/resources/publications'],
];

const DELETED: [from: string, to: string][] = [
  ['/python-api', '/tutorials'],
  ['/web-app', '/tutorials'],
  ['/getting-started', '/quickstart'],
  ['/resources', '/references'],
];

function relocate(route: string): string {
  if (EXACT[route]) return EXACT[route];
  const under = (prefix: string) => route === prefix || route.startsWith(`${prefix}/`);
  const moved = MOVED.find(([from]) => under(from));
  if (moved) {
    const to = moved[1] + route.slice(moved[0].length);
    return EXACT[to] ?? to;
  }
  return DELETED.find(([from]) => under(from))?.[1] ?? route;
}

// `/404.html` needs no rule: stripping `.html` leaves `/404`, which has no page, so Next
// renders `app/not-found.tsx` — the right answer with the right status.

/** Generated artifacts nothing should still be asking for. */
const GONE = new Set(['/searchindex.js', '/objects.inv']);

/** `/<path>.md` is the conventional raw-markdown URL; the route lives at `/md/<path>.md`. */
function markdown(pathname: string): string | null {
  if (!pathname.endsWith('.md') || pathname.startsWith('/md/')) return null;
  const route = pathname.slice(0, -'.md'.length);
  return route === '/' || route === '' ? null : `/md${pathname}`;
}

function target(pathname: string): string | null {
  // viewcode's in-site copy of the SDK; `[source]` links now go to GitHub.
  if (pathname.startsWith('/_modules/')) return PY_API_URL;

  const clean = pathname.endsWith('.html') ? pathname.slice(0, -'.html'.length) : pathname;
  if (clean === '/index') return '/';

  const route = clean.replace(/\/index$/, '');
  const named = RENAMED[route] ?? MACHINERY[clean];
  if (named) return relocate(named);

  const moved = relocate(route);
  return moved === route && clean === pathname ? null : moved || '/';
}

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // `pnpm dev` only: Next inlines NODE_ENV, so no build keeps this. The browser sends no Origin
  // on a same-origin GET, and the platform answers its session check only with one.
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.OP_SERVER_PROXY &&
    pathname.startsWith('/api/v1/')
  ) {
    const headers = new Headers(request.headers);
    if (!headers.has('origin')) headers.set('origin', request.nextUrl.origin);
    const url = new URL(pathname + request.nextUrl.search, process.env.OP_SERVER_PROXY);
    return NextResponse.rewrite(url, { request: { headers } });
  }

  if (GONE.has(pathname)) return new NextResponse(null, { status: 404 });

  const md = markdown(pathname);
  if (md) {
    const url = request.nextUrl.clone();
    url.pathname = md;
    return NextResponse.rewrite(url);
  }

  const to = target(pathname);
  if (!to || to === pathname) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = to;
  return NextResponse.redirect(url, 301);
}

export const config = {
  // `_static` passes through byte-identical, `_next` must never be rewritten, and of `api` only
  // `api/v1`, the dev proxy, comes here.
  matcher: ['/((?!_next/|_static/|api/(?!v1/)).*)'],
};
