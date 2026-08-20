# fumadocs-openapi 11.2.3 — the surface we use, and the traps

Pinned exactly. `fumadocs-core`/`fumadocs-ui` 16.14.3, `fumadocs-mdx` 15.2.3, `next` 16.3.0,
`react` 19.2.8, `tailwindcss` 4.3.3. **Verify any API claim against the installed `.d.ts`,
not against blog posts or upstream examples** — 11.0 was a breaking release and 16.2 / 16.10 /
16.12 / 16.14 each shipped breaking changes of their own.

## Exports map

```
.  ./i18n  ./playground/client  ./requests/generators(+/all,/csharp,/curl,/go,/java,
   /javascript,/python,/rust)  ./scalar  ./server  ./ui  ./ui/base  ./ui/create-client  ./css/*
```

There is no root re-export of the UI or server pieces you want; every import is a subpath.

## `fumadocs-openapi/server`

```ts
createOpenAPI({ input, proxyUrl, disableCache })
```

`input` is either an **array** of strings (each mapped to itself) or a **record** of
value-or-thunk keyed by document id. v11 dropped the whole-map factory form. We pass a record
of thunks so a spec is read only when a page needs it:

```ts
input: Object.fromEntries(REST_API_PAGES.map((page) => [page.id, () => readSpec(page.id)]))
```

The returned object exposes `options`, `getSchema`, `getSchemas`, `createProxy`,
`staticSource`, `dynamicSource`, `loaderPlugin`, `preloadOpenAPIPage`, `_getWatchPaths`.

**`getSchema(id)` returns `{ bundled }` and nothing else.** `.dereferenced` was removed in
v11 — dereferencing now happens at render time, and the client reads it off
`ctx.schema.dereferenced`. Internally `loadDocument` runs `bundle()` from
`@fumadocs/api-docs/schema/bundle` and then `upgrade(bundled, '3.2')` from
`@scalar/openapi-upgrader`, so a 3.0.2 or 3.1.0 document is **normalised to 3.2 in memory**.
Ours are mixed: `design`, `embeddings`, `fold`, `predictor` declare 3.0.2; the rest 3.1.0.

**`getSchema` memoises the promise in a `Map` closed over by each `createOpenAPI()` instance** —
per-instance, not module-global; it behaves process-wide here only because `lib/openapi.ts`
exports one module-level `openapi`. That is so unless `disableCache: true`, and
`_getWatchPaths()` only reports input keys that are existing files — ours are ids like
`'fold'`, so it reports none. Consequence:

> After `pnpm sync:specs`, **restart `pnpm dev`.** Editing `specs/*.json` invalidates nothing:
> the file is read with `readFile`, not imported, so Turbopack does not recompile, and the
> cached promise survives.

`getSpecDocument` in `lib/openapi.ts` wraps the `.bundled` access in React `cache()` — a
second, per-request layer so one render pass decrypts/parses once.

This site does **not** use `staticSource`, `dynamicSource` or `loaderPlugin`. REST pages are
ordinary MDX pages carrying `openapi: <id>` frontmatter, and `lib/source.tsx` declares a
single `docs` source. So there is no `type: 'openapi'` in the page union, `_openapi` metadata
does not exist, and the method badges those plugins add are not available — our own
`MethodLabel` covers it.

## `fumadocs-openapi/ui`

`createOpenAPIPage(options) => FC<OpenAPIPageProps>` — a **client** component. v11 removed
`APIPage`, `createAPIPage` and `defineClientConfig`, and the component no longer receives the
`OpenAPIServer`. `createClientAPIPage` **survives** at `fumadocs-openapi/ui/create-client` as a
deprecated alias of `createOpenAPIPage`, with `CreateClientAPIPageOptions` and
`ClientApiPageProps` as deprecated type aliases — import `createOpenAPIPage` from
`fumadocs-openapi/ui` instead.

`OpenAPIPageProps_Spec` = `Omit<GeneratedPageProps, 'document'> & { payload: { bundled, proxyUrl? } }`.
`getApiPageProps` in `lib/openapi.ts` supplies `payload`, `showTitle`, `showDescription`,
`operations`.

`CreateOpenAPIPageOptions`, below. Note `playground` spreads `PlaygroundClientOptions`, so it
also accepts `components.ResultDisplay` (default `DefaultResultDisplay`), `renderParameterField`
and `renderBodyField` — none of which we set:

| field | default (from source) | set here |
|---|---|---|
| `generateTypeScriptDefinitions` | a built-in generator; `false` disables | no |
| `codeUsages` | `registerDefault(createCodeUsageGeneratorRegistry())` | no — see the note below |
| `generateCodeSamples` | **none — unset**; `x-codeSamples` is appended unconditionally either way | **`() => []`** — a true no-op; it cannot suppress `x-codeSamples`. See `rendering.md` |
| `shiki` / `shikiOptions` | library defaults | no |
| `showResponseSchema` | `true` | no |
| `mediaAdapters` | built-ins | no |
| `content.renderResponseTabs` / `renderRequestTabs` | built-ins | no |
| `content.renderAPIExampleLayout` / `renderAPIExampleUsageTabs` | built-ins | no (the slot is dropped instead) |
| `content.renderPageLayout` | flat `<div>` of every operation | **yes** |
| `content.renderOperationLayout` | all nine slots stacked | **yes** |
| `content.renderWebhookLayout` | built-in | no |
| `schemaUI.render` / `schemaUI.showExample` | built-in / `false` | no |
| `playground.enabled` | `true` | no |
| `playground.provider` | built-in `AuthProvider` | **no — see below** |
| `playground.render` | built-in | no |
| `playground.transformAuthInputs` | none | **`() => []`** |
| `playground.fetchOptions` | see `playground.md` | **yes** |
| `playground.components.CollapsiblePanel` | `DefaultCollapsiblePanel` | **yes** |
| `operation.APIExampleSelector` | built-in | no |
| `components.Heading` | `fumadocs-ui/components/heading` | **yes** |
| `components.CodeBlock` / `components.Markdown` | built-ins | no |
| `storageKeyPrefix` | `'fumadocs-openapi-'` | no |
| `renderHeading` / `renderCodeBlock` / `renderMarkdown` | — | deprecated, use `components.*` |

Slot names, exactly:

- `renderPageLayout(slots, ctx)` — `slots.operations?: { item, children }[]`, `slots.webhooks?`
- `renderOperationLayout(slots, { operation, method, pathItem, ctx })` — `header`,
  `description`, `apiExample`, `apiPlayground`, `authSchemes`, `parameters`, `body`,
  `responses`, `callbacks`
- `renderWebhookLayout(slots)` — same minus `apiExample`/`apiPlayground`, plus `requests`

## Not exported — do not reach for these

| what | where it lives | do instead |
|---|---|---|
| `MethodLabel` / `Badge` | `dist/ui/components/method-label.js` (internal) | our own `components/rest-api/method-label.tsx`, colours copied |
| `idToTitle` | `@fumadocs/api-docs/utils/id-to-title` | copied into `lib/openapi-endpoints.ts` |
| `AuthProvider` | internal to the playground | never replace it; `playground.provider` *replaces* it and `useAuth()` then throws |
| `AnchorSection` / `useAnchorId` | `@fumadocs/api-docs/auto-anchor/client` | see below |

**`@fumadocs/api-docs` is not resolvable from the project root.** Under this pnpm layout
`node_modules/@fumadocs` does not exist — the package only sits inside
`node_modules/.pnpm/@fumadocs+api-docs@0.2.2_…/`. Declaring it as a direct dependency would
likely resolve to a *separate* instance with a different peer hash, so the `AnchorContext`
you provide would not be the one the library's internals read. That is why the duplicate-id
problem is contained rather than fixed.

## Known upstream defect: non-unique ids inside an operation

`dist/ui/operation/index.js` renders headings with literal ids (`request-body`,
`response-body`, `authorization`, `parameters-<type>`) through
`useAnchorId([...])`. `useAnchorId` prefixes with the surrounding `AnchorSection` segments —
and `<Operation>` is **not** wrapped in one, so the prefix is identical for every operation on
the page. The schema UI has the same problem per field (`useAnchorId([name])`).

Measured on `/rest-api/fold`:

| endpoints expanded | duplicate ids |
|---|---|
| 1 | none |
| 3 — the checker's `rows.slice(0, 3)`, all three GETs, so no `request-body` heading exists yet | `response-body ×3`, `parameters-path ×2` |
| all 17 | `response-body ×17`, `request-body ×11`, `request-body.applicationjson.body ×11`, `parameters-path ×5`, `parameters.path.job_id ×4`, `parameters-query ×2`, `parameters.path.index ×2` |

The `request-body` collisions are real but only surface once **two request-bodied (POST)
operations** are open, which the three-click check on `fold` never reaches — the 4 vendor anchor
buttons it finds there come from response schemas, not request bodies.

Lazy mounting bounds it. Mitigation is two-part and presentational: the `components.Heading`
override drops the copy-anchor link, and one CSS rule hides the schema fields'
`svg.lucide-link` buttons. Nothing we own links to those ids — the TOC targets tag and
operation anchors only, and `pnpm check:restapi` asserts every TOC anchor resolves to exactly
one element (27/27 on `fold`, 127/127 on `embeddings`). **Deep links to `#request-body` are
unreliable and always were.**

## Styling contract

```css
@import 'fumadocs-openapi/css/preset.css';
@source '../node_modules/fumadocs-openapi/dist/**/*.js';
```

Both are required in `app/global.css`. The library's components are Tailwind-classed, so
without the `@source` line Tailwind never sees those class names and the playground renders
unstyled. It compiles to `var(--color-fd-*)`, so overriding the fumadocs tokens re-themes the
playground without touching a component.

## Version traps worth restating

- `fumadocs-ui@16` is the **Radix** build. Upstream examples alias `fumadocs-ui` to
  `@fumadocs/base-ui`, which has a different keep-mounted prop (`forceMount` vs
  `keepMounted`). An example copied verbatim gives the wrong build.
- `fumadocs-ui` has **no root export**; every import is a subpath.
- Page components are per-layout. This site uses `layouts/notebook`, so `DocsPage`/`DocsBody`
  must come from `fumadocs-ui/layouts/notebook/page`.
- `createProxy`'s `allowedOrigins` fell back to same-origin-only (with a warning) as of
  11.2.2 — earlier guidance that omitting it is permissive is wrong.


## Static imports that cannot be configured away

- `dist/ui/base.js:7` statically imports `../requests/generators/all.js`, which statically
  imports curl, javascript, go, python, java, csharp and rust. **All seven ship to the browser**
  no matter what `codeUsages` or `generateCodeSamples` are set to.
- `dist/ui/index.js:3` statically imports `fumadocs-core/highlight/shiki/full`, used only as the
  `??` fallback for the `shiki` option. Passing your own factory does not remove it. The escape
  hatch is `fumadocs-openapi/ui/base` → `createOpenAPIPageBase`, which requires `shiki`
  explicitly and never touches the full module.

## More traps in the option surface

**The deprecated options win.** `renderHeading`, `renderCodeBlock` and `renderMarkdown` are each
checked *first* by their dispatcher, which returns before consulting `components.Heading` /
`components.CodeBlock` / `components.Markdown`. Setting both silently ignores the new one — the
opposite of what "deprecated" normally implies.

**`renderWebhookLayout` takes one parameter.** `(slots) => ReactNode`, with no context object,
so a webhook layout cannot reach `ctx`, `operation`, `method` or `pathItem` — and the React
context that holds them is not importable. `renderOperationLayout` does get a second
`{ operation, method, pathItem, ctx }`. The slot sets also differ: webhooks have `requests`
where operations have `apiExample` + `apiPlayground`.

**`schemaUI.render`'s declared type is wrong, not merely narrow.** It is typed
`(options: { root, readOnly?, writeOnly? }, ctx)`, but `ctx.SchemaUI` is actually invoked with
`client` — the `{ name, required?, as? }` object that drives the field label *and* its anchor id
— and sometimes `showExample`. A renderer written against the declared type silently loses the
field name and emits unlabelled, unanchored schemas. The accurate shape is the one on
`RenderContext.SchemaUI`.

**`getSchema` on an unknown id does not throw.** It logs
`[Fumadocs OpenAPI] the document "X" is not listed in the input array…` and then calls
`loadDocument(X)`, which tries to read a file literally named `X` and fails with
`[OpenAPI] Failed to resolve input: X`. Only the `SpecId` type prevents this today; an `as SpecId`
cast in new code removes that protection.

**`OpenAPIV3_2.HttpMethods` admits nine methods; `methodKeys` lists six.** `methodKeys`
(`get, post, patch, delete, head, put`) is the only enumeration the library ever uses — for
callbacks and for page building — and `lib/openapi-endpoints.ts` mirrors it. An `options:`,
`trace:` or `query:` operation renders nowhere, in no TOC, with no warning.

**`createProxy` drops bodies with no `content-length`.** `rewriteRequest` gates on
`contentLength && parseInt(contentLength) > 0`, so a chunked or streamed POST is forwarded
body-less, and an `overrides.request` reading `request.body` gets an already-emptied Request.

**`ctx.schema.dereferenced` is a `@scalar/json-magic` Proxy.** It resolves `$ref` lazily on
property access. Do not assume values read off it are structurally-cloneable or
`JSON.stringify`-safe, and remember the server side of this codebase walks the plain `bundled`
document instead — see `grouping.md`.

**Hash matching differs between us and the library.** `AccordionItem` and `SelectTab` open on
`anchorIdStartsWith(hash, id)` — equal, or `hash` starts with `id + '.'` — which is how a
library-generated link like `#response.200.applicationjson.response` is meant to open an
accordion and select a media type. `useHashTarget` matches exactly, so such a hash never opens
the containing card.
