---
name: op-docs-rest-api
description: How the nine REST API reference pages render in this repo — committed OpenAPI specs and scripts/sync-specs.mjs, tag grouping and the anchor scheme, the collapsible endpoint UI, the fumadocs-openapi 11.2.3 surface and its traps, the playground's security model and /api/playground-proxy, page frontmatter and URL/anchor compatibility, and how to verify a change. Use when touching anything under content/docs/rest-api/, specs/, lib/openapi*, components/api-page.tsx, components/rest-api/, app/api/playground-proxy/, scripts/sync-specs.mjs or scripts/check-restapi.mjs; when adding, removing or resyncing a spec; when changing how endpoints group, collapse or anchor; or when debugging a TOC link that scrolls nowhere, an endpoint that expands to an empty body, a 401 from Send, code-sample tabs reappearing, or a spec edit that does not show up.
---

# REST API doc pages

Nine reference pages under `/rest-api/*`, replacing nine Swagger UI mounts, a 2.8 MB vendored
bundle, 654 KB of `.js`-disguised specs and 10 near-duplicate glue scripts (only 9 of them
mounted — `swaggerPoet.js` was orphaned). **170 operations**
across 651 KiB of committed specs. Every page is public, prerendered (`●` SSG) and offline at
build time; only `/api/**` needs a server.

## The whole path, end to end

```
scripts/sync-specs.mjs  ──►  specs/<id>.openapi.json          committed artifact, dev-built
                                     │
             lib/openapi.ts  createOpenAPI({ input: thunks })  ── getSchema(id).bundled
                                     │                                    │
   app/(docs)/[...slug]/page.tsx     │                          lib/openapi-toc.tsx
     specIdForSlug(slug.at(-1))      │                            endpointsToc()  ← SERVER
     toc = [...page.toc, ...endpointsToc(doc)]                          │
                                     ▼                                  ▼
                 <OpenAPIPage {...getApiPageProps(id)} />        right-hand TOC
                     components/api-page.tsx  ← CLIENT
                       renderPageLayout   → buildEndpointTree(ctx.schema.dereferenced)
                       renderOperationLayout → drops header · apiExample · authSchemes
                                     ▼
                 components/rest-api/endpoint-list.tsx
                   tag Sections (open, always mounted) ▸ EndpointCards (collapsed, lazy)
                                     ▼
                     Send → /api/playground-proxy → platform API
```

The page is an **ordinary MDX page** with `openapi:` frontmatter. This site does not use
`openapi.staticSource()` / `loaderPlugin()`, so there is no `type: 'openapi'` to branch on.

## File inventory

| file | role |
|---|---|
| `scripts/sync-specs.mjs` | the only writer of `specs/*.openapi.json` — sourcing, filters, patches, validation |
| `specs/*.openapi.json` | nine committed documents; the build reads nothing else |
| `lib/openapi.ts` | `REST_API_PAGES` registry, `SpecId`, `getSpecDocument`, `getApiPageProps` |
| `lib/openapi-endpoints.ts` | the tag tree, ordering, anchors. **Imported by client and server** |
| `lib/openapi-toc.tsx` | the server-rendered endpoint TOC (`<method> <path>`) |
| `components/api-page.tsx` | `createOpenAPIPage` config: layout overrides + playground lockdown |
| `components/rest-api/endpoint-list.tsx` | the collapsible section / card UI |
| `components/rest-api/method-label.tsx` | coloured HTTP verb, shared by TOC and rows |
| `components/rest-api/use-hash-target.ts` | deep-link / TOC-click opening |
| `app/api/playground-proxy/route.ts` | server-side bearer injection, origin allowlist |
| `app/(docs)/[...slug]/page.tsx` | the `openapi` frontmatter branch and TOC merge |
| `content/docs/rest-api/*.mdx` + `meta.json` | prose, frontmatter, sidebar order |
| `app/global.css` | `fumadocs-openapi/css/preset.css`, the `@source` line, one `[data-rest-api]` rule |
| `scripts/check-restapi.mjs` | `pnpm check:restapi` — the structural contract, in Chrome |

## Reference files — load the one you need

| file | when |
|---|---|
| `references/pipeline.md` | anything about `specs/` or `sync-specs.mjs`: sourcing modes, allowlists, patches, `--check`, adding a spec |
| `references/grouping.md` | tag grouping, `chainOf`, ordering, the anchor scheme, worked trees per spec, the TOC |
| `references/rendering.md` | `createOpenAPIPage` options, dropped slots, mount/collapse semantics, a11y, styling |
| `references/playground.md` | the lockdown, the proxy route, the security model and its residual risk |
| `references/library.md` | the fumadocs-openapi 11.2.3 surface, what is not exported, removed APIs, static imports |
| `references/authoring.md` | frontmatter contract, prose rules, heading/anchor compatibility, adding a page |
| `references/verifying.md` | every `check:*` command, what `check:restapi` asserts, environment caveats |

## The invariants worth memorising

1. **The URL slug picks the spec, not the frontmatter.** `openapi:` is a truthiness flag;
   `specIdForSlug(slug.at(-1))` does the work. Renaming a file silently kills its endpoints.
2. **`SPECS`, `REST_API_PAGES` and `specs/*.openapi.json` are one bijection.** A missing file is
   an ENOENT during prerender; a missing registry row is a prose-only page with no error.
3. **Anchors must be unique across MDX headings, tag sections and operation rows.** The
   `-endpoint` suffix on section anchors is what keeps them apart — seven anchors collide today
   without it. A duplicate breaks the TOC's React key, `getElementById` and `useHashTarget` at
   once.
4. **Sections stay mounted when collapsed; endpoint bodies stay mounted once opened.** fumadocs'
   TOC registers anchors once via `getElementById` and never re-registers.
5. **The anchor lives on the collapsed row**, so `renderOperationLayout` must keep dropping
   `header` — re-enabling it duplicates `slug(title)`.
6. **`transformAuthInputs: () => []`** is the only thing keeping a bearer out of `localStorage`.
   The `CollapsiblePanel` override is cosmetic. **`proxyForwardCookie: false`** is what makes the
   playground work at all.
7. **`'/api/playground-proxy'` is a literal in two files** plus the route directory. Only
   `fetchOptions.proxyUrl` in `components/api-page.tsx` actually takes effect.
8. **Never hand-edit a spec.** `pnpm check:specs` compares raw bytes, including the one-space
   indent and the trailing newline.

## Recipes

**Resync the specs** — `pnpm sync:specs`, then **restart `pnpm dev`** (`getSchema` caches the
promise per process and nothing watches `specs/`), then `pnpm check:specs && pnpm build && pnpm check:restapi`.
Never `--env prod`: it exits 1 on `prompt`, and `--env prod --only <others>` silently overwrites
the committed dev bytes. → `references/pipeline.md`

**Add a spec/page** — `SPECS` row → `REST_API_PAGES` row → `content/docs/rest-api/<slug>.mdx`
with `openapi:` → `meta.json` `pages` → sync → verify. `SpecId` is derived with `as const`, so
the typechecker finds the rest. → `references/pipeline.md`, `references/authoring.md`

**Change grouping, nesting or titles** — everything is in `buildEndpointTree`. Section titles
come from `GROUP_TITLES[key] ?? titleCase(key)` (add a key; anchors are unaffected). Watch
`hierarchical`, a whole-document flag: one 3-tag operation restructures the entire page.
→ `references/grouping.md`

**Change what an expanded endpoint shows** — `content.renderOperationLayout` in
`components/api-page.tsx`. Re-adding `slots.apiExample` brings back all seven language tabs.
→ `references/rendering.md`

**Debug a TOC link that scrolls nowhere** — the server tree (from `bundled`) and the client tree
(from the `dereferenced` proxy) disagree, or an anchor collided, or something got unmounted.
`pnpm check:restapi` asserts every TOC anchor resolves to exactly one element. → `references/grouping.md`

**Debug an endpoint that expands to an empty body** — the `bodies` Map missed. Both sides must
compute `operationKey(path, method)` identically, and `listOperations` must enumerate exactly
what `buildEndpointTree` does. → `references/rendering.md`

**Debug a 401 from Send** — signed out is by design. Signed in: check `proxyForwardCookie` is
`false`, then read the STALE-401 note — the in-route refresh cannot receive `op_refresh`, because
that cookie is scoped `Path=/api/auth`. → `references/playground.md`

**Verify** — `pnpm types:check && pnpm build && pnpm check:restapi`, plus `pnpm check:specs` if
specs moved. → `references/verifying.md`

## Known gaps, carried deliberately

- **`#endpoints` is gone.** Each of the nine old spec pages had that heading above its Swagger
  mount (`index.rst` had neither); the new pages have `<tag>-endpoint` anchors instead. Nine
  inbound deep links land on the right page and do not scroll. Fix is one guarded
  `<span id="endpoints" />`; parked with the rest of the URL-compatibility work.
- **Duplicate ids inside expanded operations** (`#request-body`, `#response-body`) — upstream
  defect, bounded by lazy mounting, mitigated by hiding the copy affordances. Not fixable without
  a direct `@fumadocs/api-docs` dependency, which would give a second React context.
- **`models` publishes no endpoints** because `/api/v1/models` is deployed nowhere. Parity with
  the old site, not a regression.
- **`fold` uses an undeclared tag** (`minifold`), so that section has no description.
- **The proxy restricts origin but not path or method.** Any authenticated reader can reach any
  platform path with their own bearer. That is the residual XSS surface; `filterRequest` is the
  lever if it needs closing.
- **Upstream `Set-Cookie` passes through the proxy unlaundered**, and `POST /api/v1/auth/login`
  is playground-runnable — so a docs host under `*.openprotein.ai` can be handed a stray
  platform refresh cookie at `Path=/`.
- **Cross-environment token forwarding is allowed**: specs list dev first and the allowlist holds
  both platform origins.
- **Generated endpoint content is not searchable** — the index is built from MDX at compile time.
- **Three dangling `./*.rst` links survive across two pages**, and no check reports them.

Every one of these is written up with its mechanism and its fix in the reference file for its
area. When you touch this subsystem, read that file first — most of it exists because something
here failed silently once.
