# The renderer — `components/api-page.tsx` and `components/rest-api/`

## Server → client boundary

| File | Runs | Notes |
|---|---|---|
| `lib/openapi.ts` | server | `node:fs`, `react.cache` |
| `lib/openapi-endpoints.ts` | **both** | pure; imported by the client card list |
| `lib/openapi-toc.tsx` | server | imports `lib/env.ts` — must not reach the client |
| `components/api-page.tsx` | client (`'use client'`) | `createOpenAPIPage` returns a client component |
| `components/rest-api/endpoint-list.tsx` | client | |
| `components/rest-api/use-hash-target.ts` | client | |
| `components/rest-api/method-label.tsx` | neither directive | plain leaf; the server TOC and the client list both use it |

`lib/env.ts` reads `process.env.OP_SERVER_PROXY` / `OP_SERVER_ROOT_API` at module scope. Neither
is `NEXT_PUBLIC_`, and the module opens with `import 'server-only'`, so reaching it from a client
component is a build error rather than a silent fall back to the defaults. `PROXY_URL = '/api/playground-proxy'` is therefore duplicated as a literal in
`lib/openapi.ts` and `components/api-page.tsx`; both carry a "keep in sync" comment.

## `createOpenAPIPage` options this site sets

Everything else is left at the library default.

```ts
generateCodeSamples: () => []
components: { Heading }
content: { renderPageLayout, renderOperationLayout }
playground: { transformAuthInputs, fetchOptions, components: { CollapsiblePanel } }
```

### `generateCodeSamples: () => []` — a no-op, and worth understanding why

**This option is not what removes the code tabs.** `generateCodeSamples` is consulted only inside
`UsageTabs`, which is only ever constructed as the `apiExample` slot — and that slot is dropped,
so `UsageTabs` never mounts and nothing is generated regardless.

It adds nothing at all. The option has **no library default** (`createOpenAPIPageBase`'s
destructure leaves it `undefined` and every call site is behind an `if (ctx.generateCodeSamples)`
guard), and `x-codeSamples` is appended to the registry by a **separate, unconditional**
statement in `usage-tabs.js` that `generateCodeSamples` can neither gate nor filter. So returning
`[]` is indistinguishable from omitting the option. It is kept as a statement of intent.

What it does **not** do is remove the seven generators. `codeUsages` still defaults to
`registerDefault(createCodeUsageGeneratorRegistry())`, and `dist/ui/base.js:7` **statically**
imports `../requests/generators/all.js`, which statically imports curl, javascript, go, python,
java, csharp and rust. All seven ship to the browser. Passing
`codeUsages: createCodeUsageGeneratorRegistry()` from `fumadocs-openapi/requests/generators`
would empty the registry, but the modules stay in the graph because the import is static.

Same shape of issue one level up: importing from `fumadocs-openapi/ui` statically pulls
`fumadocs-core/highlight/shiki/full` (`dist/ui/index.js:3`), used only as a `??` fallback.
Passing your own `shiki` does not remove it. The library's escape hatch is
`fumadocs-openapi/ui/base` → `createOpenAPIPageBase`, which requires `shiki` explicitly. Note
the site *does* render library code blocks indirectly (the playground result display, and
Markdown `pre`), so this is a bundle-size question, not dead weight.

**If you ever re-add `slots.apiExample`, all seven language tabs come back.**

### `components.Heading`

```tsx
Heading: ({ id, depth, className, children, ...props }) => {
  const Tag = `h${Math.min(depth + 1, 6)}` as 'h2';
  return <Tag id={id} className={`scroll-mt-24 ${className ?? ''}`} {...props}>{children}</Tag>;
}
```

Replaces `fumadocs-ui/components/heading`, which wraps the text in `<a href="#id">` with a
hover copy button. Those ids are **not unique down the page** — every expanded operation
renders its own `#request-body` — so the link it hands out points at whichever one comes
first. `depth + 1` because the endpoint row above already occupies a level.

Measured: with one endpoint open there are **zero** duplicate ids on the page and zero
`a[href^="#"]` inside the panel. With three open: `request-body ×3`, `response-body ×3`,
`request-body.applicationjson.body ×3`. Lazy mounting is what bounds it, and hiding the copy
affordances is what stops a reader acting on it. See `library.md` for why the root cause is
not fixed.

The schema UI renders its own per-field copy-anchor button with the same problem. That one is
not a `Heading`, so it is hidden in CSS (`app/global.css`, the last rule):

```css
[data-rest-api] button:has(> svg.lucide-link) { display: none; }
```

`svg.lucide-link` is theirs (`LinkIcon`). Our own Copy link button renders `lucide-link-2`
and is untouched — the class token differs, so the selector cannot match it. If a future
lucide release renames the class the buttons reappear, which is a visible regression rather
than a silent one.

### `content.renderPageLayout`

```tsx
renderPageLayout: (slots, ctx) => {
  const bodies = new Map<string, ReactNode>();   // keyed by operationKey(path, method)
  for (const entry of slots.operations ?? []) …
  if (bodies.size === 0 && webhooks.length === 0) return <p>This service publishes no endpoints yet.</p>;
  return <><EndpointRoot tree={buildEndpointTree(ctx.schema.dereferenced)} depth={2}
             bodies={bodies} markdown={(md) => ctx._default_processMarkdown(md)} />
           {webhooks.map(…)}</>;
}
```

- The library default stacks every operation expanded and ungrouped.
- Bodies are keyed by `operationKey(path, method)` = `` `${method.toLowerCase()} ${path}` ``,
  so the tree can place them in any order.
- The client sees `ctx.schema.dereferenced`; the server TOC sees the **bundled** document off
  `page.data`/`getSpecDocument`. Both must produce the same tree — they do, because the tree
  only reads `tags`, `paths` key order, `summary` and `deprecated`.
- Section descriptions are rendered with `ctx._default_processMarkdown`, passed down as the
  `markdown` prop, because a tag description is markdown.
- The empty branch is what `models` renders. It returns **before** `EndpointRoot`, so that
  page has no `[data-rest-api]` element at all — `check-restapi.mjs` special-cases it.

### `content.renderOperationLayout`

```tsx
renderOperationLayout: (slots) => (
  <div className="min-w-0">
    {slots.apiPlayground}{slots.description}{slots.parameters}
    {slots.body}{slots.responses}{slots.callbacks}
  </div>
)
```

Three of the nine slots are dropped:

- **`header`** — the summary as a heading plus the Deprecated badge. The collapsed row is the
  endpoint's title and owns its anchor and its badge; a second heading underneath would
  compete for the same job.
- **`apiExample`** — the pinned column of generated snippets *and* the example response
  beside it. Dropping it is what frees the right-hand gutter for the endpoint TOC. The full
  response schema is unaffected: it comes from `slots.responses`, gated on
  `showResponseSchema` (default `true`).
- **`authSchemes`** — an "Authorization" block documenting a bearer the reader cannot supply
  here. See `playground.md`.

`showTitle: true` is still passed from `getApiPageProps` even though `header` is dropped,
because it is what increments fumadocs' internal `headingLevel` from 2 to 3.

`renderWebhookLayout` is left at the default. None of the nine specs declare webhooks; the
code path exists so a future one does not silently vanish.

## The collapsible UI — `components/rest-api/endpoint-list.tsx`

Exported: `EndpointRoot`. Internal: `EndpointList` (recursive), `Section`, `EndpointCard`,
`CopyButton`.

`EndpointRoot` wraps everything in `<div data-rest-api className="@container flex flex-col text-sm">`.
`data-rest-api` is the scope for the one CSS rule above; `@container` drives the row's
`@md:` summary column.

### Mount and open semantics — the two levels differ on purpose

| | default state | when hidden |
|---|---|---|
| `Section` (a tag) | **open** | children stay **mounted**, hidden with `hidden` |
| `EndpointCard` (an operation) | **closed** | body **not rendered** until first opened, then kept mounted and hidden |

Sections stay mounted because fumadocs' TOC registers its anchors **once**, via
`document.getElementById`, and nothing re-registers them — a row inside an unmounted section
would never highlight, and a deep link would have nothing to scroll to.

Endpoint bodies are lazy because rendering all 93 embeddings operations up front would mount
93 playgrounds and 93 expanded schema trees, which is most of what made the old Swagger page
slow. They are never *un*mounted after opening, because that would throw away whatever the
reader typed into the playground — a stray click would cost them their request body.

Sections open by default is the **one deviation from the MVP**, which collapsed both levels:
with 34 sections on `embeddings` a collapsed-by-default page is a stack of tag names, and the
endpoint list is the page's navigation.

### The row

The anchor and the flex layout are the `<h3>`/`<h4>`/`<h5>` itself:

- The id must be on the row, not the card — see `grouping.md`.
- A heading may only contain phrasing content, so a wrapping `<div>` is not an option, but
  several buttons side by side are.
- The two copy buttons are **siblings** of the toggle. A `<button>` inside a `<button>` is
  invalid HTML and browsers recover by dropping the inner one.
- Hover and focus therefore tint the whole heading (`hover:bg-fd-accent/50`,
  `has-focus-visible:bg-fd-accent/50`), not the toggle, which would leave a visible seam
  short of the right edge.
- Open cards get `border-fd-primary`; closed ones `border-fd-border`.

Row contents: chevron (`rotate-90` when open) · `MethodLabel` · mono path (`line-through`
when deprecated) · the summary, `truncate` and `@md:block` only, when it differs from the
path · a Deprecated badge · Copy path · Copy link.

`aria-expanded` / `aria-controls` on the toggle; the panel is
`role="region" aria-labelledby={anchor}` with id `` `${anchor}-content` ``. A section's panel
is `role="group"` with id `` `${anchor}-endpoints` ``.

### `CopyButton`

Icon-only — the row already carries a verb, a path and a summary. Not fumadocs'
`useCopyButton`, which ticks on `Promise.resolve(onCopy()).then()` with **no rejection
branch**, so a failed write leaves an unhandled rejection and is indistinguishable from a
copy that worked. `navigator.clipboard` really can be missing: it is gated on a secure
context and `next dev` prints a plain-http LAN URL people preview from.

Copy link builds `origin + pathname + '#' + anchor` rather than mutating `location.href`,
because the reader may have arrived on a URL that already carries a query string.

### `use-hash-target.ts`

```ts
useHashTarget(ids: string[], onTarget: (id: string) => void): void
```

Runs `onTarget` when `location.hash` names one of `ids` — on mount and on every later
navigation to it. Latest `ids`/`onTarget` are held in a ref and the effect keys on
`ids.join(',')`, because the array identity changes every render.

It listens for **`popstate` as well as `hashchange`**, and that is not belt-and-braces:
fumadocs renders TOC entries as plain `<a href="#id">`, and no browser fires `hashchange`
when the clicked fragment already equals `location.hash` — only `popstate`. So: click a TOC
entry (it opens), collapse the section by hand, click the same entry again — with
`hashchange` alone that second click is dead. Same for the mobile TOC popover and for the URL
Copy link hands out. `decodeURIComponent` because anchors can contain percent-encoded bytes.

A `Section` targets its own anchor plus every descendant anchor (`anchorsOf`), so a deep link
to an endpoint opens its ancestors. An `EndpointCard` targets only its own, and then re-runs
the scroll itself inside `requestAnimationFrame`: the browser performed its fragment scroll
while the row was still inside a collapsed ancestor and had no box to scroll to.

### `MethodLabel`

Colours copied verbatim from `fumadocs-openapi/dist/ui/components/method-label.js`, because
this badge sits beside the playground's own badge and two greens that disagree look like a
bug. `put` yellow, `patch` orange, `post` blue, `delete` red, everything else green.

`dark:` variants are safe in this repo: `fumadocs-ui/css/lib/base.css:275` declares
`@variant dark (&:where(.dark, .dark *))`, so the variant is class-based and follows the theme
switcher. (Bare Tailwind 4 would key it off `prefers-color-scheme`.)

## Page wiring — `app/(docs)/[...slug]/page.tsx`

```tsx
const specId = page.data.openapi ? specIdForSlug(slug.at(-1) ?? '') : undefined;
let toc = page.data.toc;
if (specId) toc = [...toc, ...endpointsToc(await getSpecDocument(specId))];
…
tableOfContent={{ single: Boolean(specId), footer: <PageActions … /> }}
…
{specId ? <OpenAPIPage {...(await getApiPageProps(specId))} /> : null}
```

- The frontmatter field is `openapi: <spec id>`; the **slug's last segment** is what maps to
  a spec, via `specIdForSlug`. Both must agree with `REST_API_PAGES`.
- `tableOfContent.single` is on for spec pages: collapsed rows are short enough that a dozen
  clear the intersection threshold at once and a per-item TOC lights up all of them.
- These pages are ordinary MDX pages with a frontmatter flag. The site does **not** use
  `openapi.staticSource()` or `openapi.loaderPlugin()` — `lib/source.tsx` has a single
  `docs` source. There is no `type: 'openapi'` in the page union to branch on.
- `generateStaticParams` covers them, so all nine prerender (`●` SSG in the build output).

## Styling

`app/global.css:4` imports `fumadocs-openapi/css/preset.css` and `:7` adds
`@source '../node_modules/fumadocs-openapi/dist/**/*.js'` so Tailwind scans the library's
class names. Both are required; without the `@source` line the playground renders unstyled.

Operation bodies deliberately render **inside** the `DocsBody` prose context — fumadocs-openapi
sprinkles its own `not-prose` where it needs to and expects prose otherwise. Only the section
headings and the endpoint rows carry `not-prose`. Do not wrap the tree in `not-prose`;
`not-prose` on an element exempts that element too, not just its descendants
(`:where([class~="not-prose"],[class~="not-prose"] *)`).


## Sharp edges

**Re-enabling `slots.header` creates a duplicate id.** The library's title heading uses
`id = slug(title)` — the identical id `EndpointCard` puts on its row. Two elements would share
it, `document.getElementById` picks the first, and every TOC click and copied link starts
landing on the wrong element. The `header` slot must stay dropped for as long as the row owns
`operation.anchor`.

**The whole bundled spec crosses the RSC boundary.** `payload.bundled` is serialised in full —
`embeddings.openapi.json` is 292 KB of JSON, 90 paths, 38 tags — and `ui/base.js` then runs
`dereferenceBundledDocument(doc)` in a `useMemo` on the client. Anything derivable on the
server from the same document (the TOC, for instance) is far cheaper than adding more
client-side spec processing.

**`proxyUrl` has three sources and only one wins.** `playground/client.js` does
`{ proxyUrl: ctx.proxyUrl, ...fetchOptions }`, so `fetchOptions.proxyUrl` in
`components/api-page.tsx` always wins. `createOpenAPI`'s `proxyUrl` is only read by
`staticSource` / `dynamicSource` / `preloadOpenAPIPage`, none of which this app uses. Changing
only `lib/openapi.ts:10` appears to do nothing — which is exactly why the drift between the two
literals would go unnoticed.

**`operations` entries are resolved eagerly, before `renderPageLayout` runs.** The library does
`resolve(dereferenced.paths?.[item.path])` and throws
`[Fumadocs OpenAPI] Path not found in OpenAPI schema: …` or `… Method … not found in operation: …`
during `PageContent`'s render. The collapsed-endpoint UI cannot mask it — the page errors. Since
`loadDocument` upgrades the document to 3.2, deriving `operations` from the raw file on disk
rather than from `getSchema().bundled` is a real way to trip this.

**No memoisation.** `renderPageLayout` runs in the library's render body, so every re-render
walks the whole magic-proxied document again (93 operations on `embeddings`), rebuilds the
`bodies` Map and the `markdown` closure, and hands `EndpointRoot` new props. Correct — state is
keyed by `section.key` / `operation.anchor` and survives — but there is no bailout, and
`_default_processMarkdown` uses `processSync` during render for every visible tag description.
`Section`'s `useHashTarget` also re-collects and re-joins every descendant anchor per render.

**`ctx._default_processMarkdown` is a private API.** The underscore is the library's marker;
it is used because `<Markdown>` is not exported from `fumadocs-openapi/ui`. A minor bump could
rename it, and the failure would be a TypeScript error (or a runtime `TypeError`) affecting
every tag description.

**`renderWebhookLayout` gets no context argument.** Its type is `(slots) => ReactNode` — one
parameter — so a webhook layout cannot reach `ctx`, `operation`, `method` or `pathItem`, and the
context it would need is not importable. The webhook branch of `renderPageLayout` is also
unreachable today: `slots.webhooks` is only populated when the `webhooks` prop is passed, and
`getApiPageProps` never passes it. If webhooks are ever added they render as raw fumadocs
operations appended below the tag tree — no section, no collapse, no anchor, no TOC entry.

**`schemaUI.render`'s declared type is narrower than the call.** It is documented as
`(options: { root, readOnly?, writeOnly? }, ctx)` but `ctx.SchemaUI` is invoked with `client`
(the `{ name, required?, as? }` object that drives the field label and the anchor id) alongside
`root` and the `readOnly`/`writeOnly` flags. A custom renderer written against the declared type
silently loses the field name and produces unlabelled, unanchored schemas.

**The deprecated `renderHeading` / `renderCodeBlock` / `renderMarkdown` options take
precedence** over their `components.*` replacements — each dispatcher checks the deprecated
field first and returns. Setting both silently ignores the new one.

### Accessibility notes, stated honestly

- **`aria-controls` dangles until first open.** The panel is `everOpened ? <div id=…> : null`
  but `aria-controls={panelId}` renders unconditionally. `Section` does not have this problem —
  its panel is always mounted.
- **The region's accessible name includes the copy buttons.** `aria-labelledby` points at the
  heading, whose subtree contains the toggle *and* both `CopyButton`s, so the region announces
  roughly `GET /api/v1/… Copy path Copy link`.
- **Every expanded endpoint becomes an ARIA landmark** (`role="region"` with a name). On
  `embeddings` a reader who expands many endpoints accumulates that many landmarks.
  `role="group"` — what the section panel uses — would avoid it.
- **In-body heading level is a constant `+1`, not depth-tracking.** `Math.min(depth + 1, 6)`
  always yields h4. Cards are h3 on six specs (h3 → h4, correct), h4 on part of `fold` (a tie),
  and h4/h5 on `embeddings` — where an h5 endpoint contains h4 body headings, a heading-order
  inversion for screen readers and outline tooling.
- **`decodeURIComponent(location.hash.slice(1))` can throw.** A malformed fragment (`#%`,
  `#%zz`) throws `URIError` inside `check()`, which runs directly in the effect body and in both
  listeners — breaking them for every `Section` and every `EndpointCard` on the page. A
  try/catch would fix it.
- **Deprecation is a badge on the row and a strikethrough, nothing more.** With
  `showTitle: true` the library's Badge lives in the dropped `header` slot, and its `type="warn"`
  Callout is built only in the `showTitle: false` branch. What remains is `EndpointCard`'s own
  `Deprecated` span plus the line-through on the row's path — both in the always-rendered
  heading, so they **stay visible** when the card is open — plus the library striking through the
  path in the playground's route bar. No warning prose is generated anywhere; a spec that wants
  one has to put it in the operation `description`, as the single deprecated operation today
  (`POST /api/v1/align/msa`) does.
- **`const Tag = \`h${…}\` as 'h2'` is a deliberate type lie**, in three places. A template
  literal is `string`, which JSX rejects as an intrinsic element. The runtime value is h2–h6.

**The `CopyButton` rationale, precisely.** The in-code comment says a failed write is
"indistinguishable from one that worked". More exactly: `useCopyButton`'s `.then()` never runs
on rejection, so a failed write shows **no** checkmark and leaves an unhandled rejection — it is
indistinguishable from a click that did nothing. The stronger motivation is the *synchronous*
throw: on an insecure-context `next dev` LAN URL `navigator.clipboard` is `undefined`, so the
callback throws before `Promise.resolve` and the click handler blows up.

**`latest.current = { ids, onTarget }` is a mutation during render** — the standard latest-ref
pattern, idempotent, so StrictMode double-rendering is harmless. Under concurrent rendering a
discarded render can leave the ref pointing at a discarded closure; both callers' closures are
equivalent across renders, so it does not bite here.
