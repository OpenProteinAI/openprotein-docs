# Authoring a REST API page

## Frontmatter contract

```yaml
---
title: Structure Prediction          # required; the h1 and the sidebar label
description: …                       # required in practice; the page subtitle + <meta>
openapi: fold                        # the spec id — this is what turns the page into a reference
---
```

Schema is `docsPageSchema` in `lib/source.tsx` — `pageSchema` extended with optional
`notebook`, `openapi`, `pythonApi`, `status`. `status` drives a sidebar badge via
`statusBadgesPlugin`.

**The `openapi:` value is decorative.** The route does
`page.data.openapi ? specIdForSlug(slug.at(-1) ?? '') : undefined` — the field is used only as a
truthiness flag, and the spec is chosen by the **URL slug**. Consequences:

- `openapi: nonsense` on `fold.mdx` still renders the fold spec.
- `openapi: ""` (or a missing field) disables the whole generated section *and* its TOC while the
  prose still renders.
- Renaming `fold.mdx` to `structure-prediction.mdx` silently kills the endpoints even though the
  frontmatter still looks right.

All nine files happen to carry the correct `SpecId`, which is exactly what hides the decoupling.
So: **the filename must equal a `slug` in `REST_API_PAGES`**, and by convention keep `openapi:`
equal to the resolved `id` so the file documents itself. Note slug and id are not always the
same string — `slug: 'assay-datasets'` maps to `id: 'assaydata'`.

**Never set `full: true`.** `DocsPage` defaults `tocEnabled = !full`, so it would remove the
desktop TOC — taking the entire endpoint navigation *and* the `PageActions` footer with it.

`content/docs/rest-api/meta.json` sets the sidebar title and the page order. It currently
lists `index` first, then the nine pages in the old site's toctree order.

## The body must not restate the description

`<DocsDescription>` renders the frontmatter `description` directly under the h1. A body that
opens with the same sentence prints it twice, which is what all nine pages did until it was
fixed. Rule: the description is the one-sentence summary; the body starts with the *next*
thing.

Watch for the failure mode that produced it: descriptions were hand-lifted from the spec's
`info.description` and two were truncated at 150 characters (`…proprietary and open...`,
`…reductions (e.g.`). If you regenerate a description from a spec, take a whole sentence.

Note `info.description` on the four specs carved out of the platform-wide `/openapi.json`
(`auth`, `assaydata`, `align`, `models`) is **not** service-specific — it is the platform's whole
"Getting Started" document, repeated in every one of them. (`prompt` is live too but comes from
its own service document and carries its own description.) The per-page prose was extracted from
the relevant section by hand.

## Heading text is an API — do not "improve" it

Anchors come from heading text via rehype-slug, and the old Sphinx pages are still linked
from outside. Every heading below is load-bearing:

| page | anchors that must survive |
|---|---|
| all nine spec pages (**not** `index`) | `#endpoints` — **currently missing, see below** |
| `assay-datasets` | `#assaydata` |
| `authentication-and-jobs` | `#job-system`, `#login`, `#steps-to-log-in`, `#on-this-page`, `#within-your-ide`, `#jobs` |
| `models` | `#core-concepts` |
| `index` | `#next-steps` |

Two of these deliberately collide with a tag section's label — `## Assaydata` sits above the
`Assaydata` tag section, and `## Jobs` above the `Jobs` one. **Keep both.** The duplication is
cosmetic (two TOC rows with the same text, distinct anchors: `#jobs` vs `#jobs-endpoint`);
deleting the prose heading would break a real inbound anchor.

### Known gap: `#endpoints`

Each of the nine spec `rest-api/*.rst` pages had an `Endpoints` section heading above its
Swagger mount, so `…/rest-api/fold.html#endpoints` was a valid deep link on those nine.
(`index.rst` had neither a mount nor an `Endpoints` section — its headings were the nine link
titles plus `Next steps`.) The new pages have no `#endpoints` element — tag sections are
`<tag>-endpoint`. The path redirect lands the reader on the right page but nothing scrolls.

Fix, if it is wanted: emit an empty `<span id="endpoints" />` immediately before
`<OpenAPIPage />` in `app/(docs)/[...slug]/page.tsx`, guarded on `specId`. Not done — flagged
as Phase 9 work, since it belongs with the rest of the URL-compatibility pass.

## Prose conventions on these pages

- Model/endpoint lists live in prose, not in the spec, on `fold`, `embeddings`, `design` and
  `predictor` (plus `models`, below). They drift: `fold.mdx` lists AlphaFold2 / Boltz / Protenix /
  RosettaFold-3 while the spec also exposes ESMFold2 and MiniFold, and `predictor.mdx` names only
  Gaussian Process while the spec also exposes `POST /api/v1/predictor/ensemble`. `predictor.mdx`
  is the worst case — the `/embeddings/models` and `/svd` paths it hardcodes belong to the
  *embeddings* spec, so nothing on that page can correct them. Prefer wording that does not
  enumerate what the spec already publishes; where an enumeration is genuinely useful, expect to
  update it when a model ships.
- Code samples in prose must use the real host and path. The base is
  `https://api.openprotein.ai` (dev: `https://dev.api.openprotein.ai`) and login is
  `POST /api/v1/auth/login`. The old page taught
  `openprotein.ai/api/v1/login/user-access-token` — wrong host *and* a path on no backend.
- External links get `target="_blank" rel="noopener noreferrer"` (handled by the shared `a`
  component in `components/mdx.tsx`).
- `authentication-and-jobs.mdx` still contains two links to `./property-regression.rst` and
  `./poet.rst`, which do not exist. They are on the known-broken-upstream list for the
  content-migration pass; do not silently drop them.

## Adding a page

See `pipeline.md` → "Adding a tenth spec". In short: `SPECS` row → `REST_API_PAGES` row →
`content/docs/rest-api/<slug>.mdx` with `openapi:` → `meta.json` → `pnpm sync:specs --only <id>`
→ `pnpm check:specs && pnpm build && pnpm check:restapi`.

## Removing a page

Delete the `SPECS` row, the `REST_API_PAGES` row, the `.mdx`, the `meta.json` entry and
`specs/<id>.openapi.json` — and add a redirect for the old URL, because it was indexed.
`REST_API_PAGES` drives `SpecId`, so the typechecker will find the stragglers.

## What the reader sees, and what they cannot

Signed out, every page renders in full: prose, tag sections, endpoint rows, request and
response schemas. **Send** returns 401 with "Sign in to run requests against the API." No page
is gated and none is dynamic — all nine prerender.


## Other things that bite

**`meta.json` has no `"..."` rest entry**, so an unlisted `.mdx` is simply absent from the
sidebar and from the `/rest-api` section cards. The page still resolves by URL, and nothing warns.

**`index.mdx` links into the auth page's prose anchors** — `/rest-api/authentication-and-jobs#login`
and `#jobs`. That is a second reason those headings cannot be renamed, and it is a link no check
currently validates.

**`models.mdx` hand-maintains an endpoint list in prose** (five endpoints: `GET /api/v1/models`,
`/{model_id}`, `/{model_id}/tokens`, `/{model_id}/{input}/{output}/params`, and
`POST /{model_id}/{input}/{output}`). When the real spec ships, that block will duplicate the
generated tree and must be pruned by hand.

**Two "empty spec" escape hatches, to remove together** when `/api/v1/models` deploys — but the
failure modes are *not* symmetric:

- `allowEmpty: true` in `scripts/sync-specs.mjs`. Leaving it once the spec ships is harmless;
  removing it before the spec ships makes `validate()` fail with `paths is empty` and blocks all
  nine writes.
- `if (slug !== 'models')` in `scripts/check-restapi.mjs`. It is **not** a blanket exemption: it
  skips six endpoint-tree assertions (root element, rows, sections, sections-expanded,
  rows-collapsed, no-panels-before-click) and substitutes an `empty spec renders no notice`
  check. The language-tab, auth-panel and TOC-anchor assertions, and the whole expand +
  deep-link block, run for `models` regardless. So leaving the guard in place once the spec
  ships makes the run **fail loudly** on the now-missing notice rather than silently skipping the
  page.

**Three dangling old-Sphinx links survive across two pages, and no check catches them.**
`authentication-and-jobs.mdx` links `./property-regression.rst` and `./poet.rst`; `index.mdx`
links `./property-regression.rst`. `createRelativeLink` leaves them verbatim, the browser
resolves them to `/rest-api/property-regression.rst`, and that 404s. `scripts/check-links.mjs`
skips any href not starting with `/` — and it also lists `rest-api` in its `UNMIGRATED` set, so
broken `/rest-api/...` routes downgrade to warnings rather than failures.

**Generated endpoint content is not searchable.** Only MDX bodies feed remark-structure and the
search index; endpoints are produced at render time from JSON. Searching for a path returns at
best the wrapper page, and the search dialog labels any `/rest-api` hit "endpoint" purely from
the URL prefix.
