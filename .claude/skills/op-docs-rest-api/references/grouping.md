# Tag grouping, ordering and anchors — `lib/openapi-endpoints.ts`, `lib/openapi-toc.tsx`

One module builds the tree. Both the **server** (which renders the TOC) and the **client**
(which renders the endpoint cards) call `buildEndpointTree` on the same document, so ids
must be derived deterministically or a TOC link scrolls nowhere. That is the whole reason
this file exists rather than reading fumadocs' own generated TOC. `toStaticData()` emits an
entry only when the operation declares an `operationId`, and coverage is far too uneven to build
on: `embeddings` declares none on any of its 93 operations and `fold` on 1 of 17 — together 65%
of all operations — while `align`, `assaydata`, `auth`, `predictor` and `prompt` declare one on
every operation and `design` on 8 of 10 (59/170 overall). A TOC that is complete on five pages,
partial on one and empty on the two biggest is not one we can render from.

## Types

```ts
type EndpointMethod = 'get' | 'post' | 'patch' | 'delete' | 'head' | 'put';

interface EndpointOperation {
  path: string;            // as the spec spells it, /api/v1 prefix included
  method: EndpointMethod;
  title: string;           // the summary; drives the anchor
  anchor: string;          // slug(title)
  deprecated: boolean;
}

interface EndpointSection {
  key: string;             // the tag name, or 'overview'
  title: string;           // GROUP_TITLES[key] ?? titleCase(key)
  anchor: string;          // slug(key) + '-endpoint'
  description?: string;    // the declared tag's description
  order: number;           // declared tag index, or 1e6+n, or -1 for Overview
  operations: EndpointOperation[];
  sections: EndpointSection[];
}

interface EndpointTree { operations: EndpointOperation[]; sections: EndpointSection[] }
```

`EndpointTree` and `EndpointSection` are structurally compatible in the two fields the
renderers walk, so every function takes `EndpointTree | EndpointSection`.

## Traversal order

`eachOperation` walks `Object.entries(document.paths)` in document order, and within each path
item the fixed list `METHODS = ['get','post','patch','delete','head','put']`, copied from
fumadocs-openapi's own `methodKeys`.

**The order is not load-bearing; the set is.** Bodies are matched by key, not by position:
fumadocs maps over the very array we hand it as `operations`, and `renderPageLayout` re-keys the
result into a `Map` under `operationKey(path, method)`. Reordering `METHODS` only changes the
display order of methods within a single path item. What must hold is that the *set* of probed
methods matches fumadocs' — which is why `listOperations` and `buildEndpointTree` both go through
`eachOperation`.

## Titles and anchors

```ts
operationTitle = operation.summary || pathItem.summary
               || (operation.operationId ? idToTitle(operation.operationId) : path)
```

`||`, not `??` — an empty-string summary must fall through, matching fumadocs. `idToTitle` is
copied verbatim out of `@fumadocs/api-docs`, where it *is* a public export
(`@fumadocs/api-docs/utils/id-to-title`, in that package's `exports` map, with types) and is what
fumadocs-openapi itself imports. The blocker is resolution, not visibility: `@fumadocs/api-docs`
is only a transitive dependency, so it does not resolve from the repo root under pnpm, and
`fumadocs-openapi` does not re-export it. Copying keeps our anchor matching the heading fumadocs
would have rendered — do not "fix" it by adding a direct dependency; see `library.md` on the
separate-instance hazard.

- `operationAnchor(title) = slug(title)` — `github-slugger`'s stateless module-level `slug`,
  **no dedup suffix**, because fumadocs slugs the same way. **Never swap in
  `new GithubSlugger()`**: a stateful slugger appends `-1`, `-2`, … to repeats, and since the
  tree is built twice per page (server for the TOC, client for the cards) the two passes would
  disagree and every TOC link would stop resolving.
- `sectionAnchor(key) = slug(key) + '-endpoint'`. **The suffix is load-bearing today, not just
  legacy compatibility.** Strip it and seven anchors collide immediately: `#jobs` (the
  `## Jobs` prose heading vs the `jobs` tag), `#assaydata` (`## Assaydata` vs the `assaydata`
  tag), and five on `fold` where a model tag's slug equals one of its own operation anchors —
  `#protenix`, `#protenix-v2`, `#esmfold`, `#minifold` (single-operation sections) and
  `#esmfold2`, whose section holds two operations (`esmfold2`, `esmfold2-fast`) of which the
  first collides. A single-operation section is neither necessary nor sufficient:
  `alphafold`/`AlphaFold2` and `rosettafold`/`RosettaFold-3` are single-operation sections that
  do **not** collide. The suffix is the namespace separator between the three anchor sources:
  MDX heading slugs, tag sections, operation rows.

  The old-site compatibility claim in the source comment is **overstated**. Sphinx's
  `addSwaggerEndpointsToTOC.js` built ids from the raw tag text, producing literal ids like
  `fold requests-endpoint` and `align data-endpoint`; `sectionAnchor` slugs first, giving
  `fold-requests-endpoint`. Slugging is clearly right — a space in a fragment is not usable —
  but only tags that are **already slug-shaped** round-trip: `auth`, `jobs`, `assaydata`,
  `predictor`, `design`, the fold model tags (`fold`, `boltz`, `alphafold`, `rosettafold`,
  `protenix`, `protenix-v2`, `esmfold`, `esmfold2`, `minifold`) and the 27 already-lowercase
  embeddings tags. The other 11 embeddings tags are ESM checkpoint names carrying capitals —
  `esm1b_t33_650M_UR50S`, `esm1v_t33_650M_UR90S_1`…`_5`, `esm2_t6_8M_UR50D`,
  `esm2_t12_35M_UR50D`, `esm2_t30_150M_UR50D`, `esm2_t33_650M_UR50D`, `esm2_t36_3B_UR50D` — and
  `slug` lower-cases them, so `#esm2_t36_3B_UR50D-endpoint` now renders as
  `#esm2_t36_3b_ur50d-endpoint`. Those old deep links are already broken.

The anchor lives on **our collapsed row**, not on fumadocs' heading (`renderOperationLayout`
drops the `header` slot). Two reasons: endpoint bodies are unmounted until first opened, so a
heading inside one cannot be a scroll target; and an expanded card is taller than the
viewport, so fumadocs' TOC `IntersectionObserver` would never mark it active.

## Section titles

`GROUP_TITLES` is ported from `__old/source/_static/js/swaggerEmbeddings.js` and maps only
five keys:

```
openprotein → OpenProtein   esm1 → ESM1   esm2 → ESM2
community → Community-based  antibody → Antibody
```

Everything else goes through `titleCase`, which upper-cases the **first character only**.
That is why the pages read `Svd`, `Poet`, `Esmfold2`, `Rotaprot-large-uniref50w`,
`Prot-seq`. Cosmetic wart, faithfully inherited from the old site. Fix by adding keys to
`GROUP_TITLES` — it does not affect anchors, which come from `key`, not `title`.

## Ordering

Declared `document.tags` order is the display order (OpenAPI defines it that way). A tag no
`tags` entry declares gets `1e6 + n` in first-appearance order, so undeclared tags sort after
every declared one. The synthetic `Overview` section gets `-1` and always sorts first.
Sorting runs after the tree is built and is recursive; anchors are derived from
title/key rather than position, so sorting cannot shift them.

## The two shapes — `chainOf`

`hierarchical` is true iff **some** operation in the document carries **3 or more** tags.

```ts
function chainOf(tags, hierarchical) {
  if (!hierarchical || tags.length < 2) {
    return hierarchical && tags.length === 1 ? [OVERVIEW, tags[0]] : tags;
  }
  return tags.length >= 3 ? tags.slice(0, -1) : tags;
}
```

| document | tags on the operation | chain | effect |
|---|---|---|---|
| flat | `['fold']` | `['fold']` | one section |
| flat | `['fold requests','boltz']` | both | two nesting levels |
| hierarchical | `['embeddings']` | `['overview','embeddings']` | a synthetic **Overview** parent appears |
| hierarchical | `['openprotein','poet','embed']` | `['openprotein','poet']` | last tag is the computation type and is **dropped** |
| hierarchical | `['community','antibody','ablang2','embed']` | first three | three nesting levels |

The last tag being dropped in the hierarchical case is why a declared tag can exist and never
become a section. On `embeddings`, `embed`/`logits`/`attn`/`score`/`generate` are all declared
but only ever appear last, so 38 declared tags produce 33 sections, plus `Overview` = **34**.

## Worked examples (measured from the rendered DOM)

**`fold` — flat, max 2 tags, 9 declared tags → 10 sections, 17 operations**

```
[H2] fold-endpoint            Fold (6)          — 6 operations directly inside
[H2] fold-requests-endpoint   Fold requests (11)
  [H3] boltz-endpoint         Boltz (3)         → boltz-1, boltz-1x, boltz-2
  [H3] alphafold-endpoint     Alphafold (1)
  [H3] rosettafold-endpoint   Rosettafold (1)
  [H3] protenix-endpoint      Protenix (1)
  [H3] protenix-v2-endpoint   Protenix-v2 (1)
  [H3] esmfold-endpoint       Esmfold (1)
  [H3] esmfold2-endpoint      Esmfold2 (2)      → esmfold2, esmfold2-fast
  [H3] minifold-endpoint      Minifold (1)      — undeclared tag, sorts last
```

**`embeddings` — hierarchical (two ops carry 4 tags), 38 declared tags → 34 sections, 93 operations**

```
[H2] overview-endpoint      Overview (21)     — synthetic; the 21 single-tag operations
  [H3] embeddings-endpoint  Embeddings (9)
  [H3] svd-endpoint         Svd (6)
  [H3] clustering-endpoint  Clustering (6)
[H2] openprotein-endpoint   OpenProtein (21)
  [H3] poet-endpoint        Poet (6)          → poet-embed, poet-logits, …
  …
[H2] esm1-endpoint          ESM1 (18)
  [H3] esm1b_t33_650m_ur50s-endpoint  Esm1b_t33_650M_UR50S (3)
  …
[H2] community-endpoint     Community-based
  [H3] antibody-endpoint    Antibody
    [H4] ablang2-endpoint   Ablang2 (2)       — the only three-deep branch
```

Operation-tag distribution on `embeddings`: 21 ops with 1 tag, 70 with 3, 2 with 4.
`21 + 70 + 2 = 93`.

Every other spec is flat and single-tag: `prompt` (2 tags/10 ops), `align` (3/11),
`auth` (2/5), `assaydata` (1/8), `predictor` (1/16), `design` (2/10), `models` (0/0).

Rendered operation rows equal the spec's operation count on every page — grouping never drops or
duplicates one (measured: `fold` 17/17, `embeddings` 93/93). **Nothing asserts this.**
`check:restapi` never reads `specs/`, so it has no spec-side count to compare against; its
closest guard is the TOC-anchor check, which catches a duplicate but not a drop — a dropped
operation vanishes from the one tree both the TOC and the cards are built from, so the check
still passes.

## Heading levels

`EndpointList` is called with `depth = 2`. A section renders `h${min(depth, 4)}`, an
operation row renders `h${min(depth, 5)}`, and the recursion passes `depth + 1`. So on
`fold`: `Fold` is h2, its operations h3; `Boltz` is h3 and `boltz-2` is h4. On the
`community → antibody → ablang2` branch the row lands at h5.

Headings *inside* an expanded operation that go through the `components.Heading` override render
as `h${min(depth + 1, 6)}`. fumadocs passes `depth = 3` — it starts at `headingLevel = 2` and
increments once because `showTitle: true` — so those come out **h4**, verified in the DOM:
`H4 #request-body`, `H4 #response-body`.

The response accordion rows **bypass the override entirely**. `ResponseAccordion` uses
`AccordionHeader` from `@fumadocs/api-docs/components/accordion`, which renders a bare `h3` with
no id and no depth input. An expanded `boltz-2` panel therefore holds two h4s and six h3s (202,
400, 401, 404, 422, 429) — so heading levels inside a panel are **not monotonic**, and nothing we
control changes that short of overriding the accordion components.

## The TOC

`endpointsToc(document)` → `TOCItemType[]`, appended to `page.data.toc` in the docs route.
Entries are `{ title, url: '#' + anchor, depth }`, starting at depth 2, clamped by
`MAX_DEPTH = 4`. The clamp means the two `ablang2` operations sit at the same TOC depth as
their own section — cosmetic, and the only place it happens.

An operation's TOC label is `<coloured method> <path>`:

- `MethodLabel` (`components/rest-api/method-label.tsx`) is shared by the TOC verb and the
  endpoint row verb. fumadocs still draws the playground badge with its **own** `MethodLabel`;
  all three match because our palette is a copy of theirs (same `font-mono font-medium` base,
  the same five `text-{colour}-600 dark:text-{colour}-400` pairs, the same green fallback), not
  because a component is shared. Change one and the copy has to follow.
  `shrink-0 whitespace-nowrap`, or a long path breaks `GET` across two lines.
- `displayPath` strips `API_ROOT` (`/api/v1`), derived from `OP_SERVER_ROOT_API` in
  `lib/env.ts` — never hardcoded. A path that does not carry the prefix passes through.
- `pathNodes` inserts a `<wbr>` after every `/`. CSS gives no break opportunity at a slash,
  so without it `/fold/models/rosettafold-3` wrapped as `rosettafol` / `d-3` in the 268px TOC
  column (251px usable inside its 16px `pe-4`). Note the `--fd-toc-width: 246px` in
  `app/global.css` never applies here — fumadocs' own `xl:layout:[--fd-toc-width:268px]` on
  `#nd-toc` wins, and below that breakpoint the column is 0 and the TOC is hidden.
  `break-words` remains as the backstop for a segment with no break opportunity at all
  (`esm1v_t33_650M_UR90S_1` — underscores do not break).

**The endpoint row keeps the full path**, deliberately: it sits directly above a playground
showing `Server URL` plus that same request line, so it is the URL you actually call. The
TOC is an index, where the repeated prefix is noise.

`lib/openapi-toc.tsx` imports `API_ROOT` from `lib/env.ts`, which opens with
`import 'server-only'` — so it is server-only by **enforcement**, not convention: a client
component importing either module fails the build. That guard is what makes the missing
`NEXT_PUBLIC_` prefix on `OP_SERVER_ROOT_API` a loud failure instead of a silent wrong value;
without it the client bundle would inline `undefined` and fall back to the `/api/v1/` default.

## Invariants

| Rule | Breaks how |
|---|---|
| Server and client must build the tree from the same document with the same code | TOC links scroll nowhere |
| `METHODS` must probe the same method **set** as fumadocs' `methodKeys` | a method fumadocs renders a body for gets no card, or a card looks up `undefined` and expands empty. The *order* is not load-bearing — bodies come from a `Map` keyed by `operationKey(path, method)`; it only sets the display order of methods within one path item |
| `operationTitle` must keep the `\|\|` chain and `idToTitle` | anchors drift from fumadocs' own heading ids |
| `sectionAnchor` must keep the `-endpoint` suffix | old deep links break, and tags start colliding with MDX heading slugs |
| Two operations in one document must not share a summary | duplicate DOM id; the TOC entry hits whichever comes first. No dedup counter exists — `check:restapi` catches it by asserting every TOC anchor resolves to exactly one element |


## Sharp edges

**`hierarchical` is a whole-document flag.** `fold` renders a three-level tree with
`hierarchical === false`, because the `!hierarchical` branch returns `tags` *verbatim* and
`['fold requests','boltz']` is two levels. Adding a single 3-tag operation anywhere in `fold`
would flip the flag document-wide and restructure the whole page: every 1-tag operation would
move under a synthetic **Overview**, and every 3-tag one would lose its last tag.

**`chainOf`'s `hierarchical && tags.length === 2` case is unreachable and inconsistent.** For
3+ tags the last tag is a computation type and is dropped; for exactly 2 in the same document
it becomes a section instead. Add `['openprotein','embed']` to `embeddings` and `embed` — a
computation type declared at tag index 2, never meant to be a section — materialises as a
section titled "Embed" with anchor `#embed-endpoint`. The embeddings tag-length set is
`{1, 3, 4}` today, so the branch never fires.

**The old site's "Computations" pseudo-group was dropped deliberately.**
`swaggerEmbeddings.js` built a second synthetic group listing every trailing tag
(`embed`, `logits`, `attn`, `score`, `generate`). `chainOf` slices those off and nothing re-adds
them, so **five declared tags produce no section, no anchor and no TOC entry at all**.
`document.tags` is not a reliable index of the sections a page will show.

**A tag literally named `overview` would be captured by the synthetic parent.** `child()`
special-cases `key === OVERVIEW` for both title and order, so a declared `overview` tag in a
hierarchical spec would be forced to title "Overview" and order `-1` regardless of its
declaration index — and merged with the synthetic parent if 1-tag operations also exist.

**Section descriptions come only from `document.tags[]`.** An undeclared tag's section renders
with no prose: `fold`'s `minifold` is the live example. The fix is to add the tag to the spec's
top-level `tags` array upstream, which also gives it a real sort order instead of `1e6`.

**`METHODS` omits `options`, `trace` and OAS 3.2 `query`.** `OpenAPIV3_2.HttpMethods` admits
nine; fumadocs' own `methodKeys` lists the same six we mirror. `eachOperation` probes only
those, and both `buildEndpointTree` and `listOperations` go through it — so such an operation is
*consistently* invisible (no card, no body, no TOC entry) rather than half-rendered. That
consistency is exactly why it is easy to miss. No spec uses one today.

**`slug()` deletes `/` rather than replacing it.** `"poet score/indel"` → `poet-scoreindel`;
`"poet score/single_site"` → `poet-scoresingle_site` (underscores survive, the slash does not).
Ugly but stable and collision-free today; the risk is a future summary differing only by
punctuation, which would slug identically with no dedup suffix to save it.

**`idToTitle` and the `path` fallback are dead code today — do not simplify them away.** All
170 operations across all nine specs define `operation.summary`, so only the first link of the
chain ever executes. The copy exists so that the day a summary is dropped, our anchor still
equals the one a stock fumadocs render would produce.

**Operation anchors track upstream summaries.** A cosmetic summary change in a spec moves the
anchor. The TOC regenerates from the same source so `check:restapi` still passes, but external
deep links break with no warning. Measured duplicate-title count is 0 across all nine specs —
the dedup-free anchor scheme is safe by measurement, not by construction.

**The two trees are built from two different objects.** `endpointsToc` walks
`(await openapi.getSchema(id)).bundled`; `renderPageLayout` walks `ctx.schema.dereferenced`,
which is a `@scalar/json-magic` Proxy over the same data that resolves `$ref` lazily on property
access. For `paths` / `tags` / `summary` the two agree today. They would diverge the moment a
spec used a `$ref` at the **path-item** level (or on `tags`/`summary`): the proxy resolves it, so
the client would render cards the server-built TOC never listed. Verified zero path-item `$ref`s
across all nine specs — latent, not live. Also: do not assume values read off that proxy are
structurally-cloneable or `JSON.stringify`-safe.

**`listOperations` and `buildEndpointTree` must enumerate the same set.** `listOperations` feeds
the `operations` prop, which decides which bodies fumadocs renders into the `bodies` Map;
`buildEndpointTree` decides which cards exist. An operation in the tree but not the list gets a
card whose `bodies.get(...)` is `undefined` — it expands to an empty panel, silently. Both go
through `eachOperation`; keep it that way. The reverse produces a rendered body nothing shows.

**A duplicate anchor breaks three things at once.** fumadocs' notebook TOC renders
`items.map((item) => jsx(TOCItem, { item }, item.url))` — the React **key is the anchor URL**, so
a duplicate gives a duplicate-key warning and unstable reconciliation; `Observer` resolves
anchors with `document.getElementById`, which returns only the first match; and `useHashTarget`
opens both matching rows.

**A tag key may occupy only one position in the hierarchy.** `child()` dedups by key within a
single parent only, so the same tag reached via two different chains produces two sections with
the *same* `sectionAnchor`. Verified: no key appears at more than one position in any spec.

**`MAX_DEPTH` (`lib/openapi-toc.tsx:14`) and the `Math.min(depth, 4)` / `Math.min(depth, 5)`
clamps in `endpoint-list.tsx` describe the same nesting budget but are independent literals in
two files.** Raise nesting on a spec without touching both and the TOC indentation and the DOM
heading levels disagree — and `SECTION_SIZE[depth - 2]` silently falls back to `text-base`.
fumadocs-ui's own `getItemOffset` caps at 44px for any depth ≥ 4, so the `community → antibody →
ablang2` subtree is visually flat in the rail even though the DOM (h4 vs h5) distinguishes it.

**`endpointsTocFromTree` must seed at depth 2.** The spec TOC is concatenated onto the MDX page
TOC, whose top level is `##` → depth 2. Seeding at 1 or 3 mis-indents the whole endpoint list
relative to headings like "Job System" on `authentication-and-jobs`.

**Our hash matching is exact; the library's is dotted-prefix.** `AccordionItem` and `SelectTab`
use `anchorIdStartsWith(hash, id)` — equal, or `hash` starts with `id + '.'` — so a
library-generated deep link like `#response.200.applicationjson.response` is *designed* to open
the matching accordion and select the media-type tab. `useHashTarget` uses `ids.includes(hash)`,
so such a hash never opens the containing `EndpointCard` and the target stays inside a `hidden`
panel. Consistent with hiding those buttons, but any future support for schema-level deep links
needs prefix matching here too.
