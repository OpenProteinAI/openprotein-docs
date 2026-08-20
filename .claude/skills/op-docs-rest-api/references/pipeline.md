# The spec pipeline — `scripts/sync-specs.mjs` → `specs/*.openapi.json`

Nine OpenAPI documents are **committed artifacts**. The build reads only `specs/`; it never
touches the network. Regenerating them is a separate, reviewable step.

```
pnpm sync:specs                              # rebuild all nine from dev, write them
pnpm check:specs                             # rebuild in memory, fail if specs/ has drifted
node scripts/sync-specs.mjs --only=fold,design
node scripts/sync-specs.mjs --ref=origin/spec-sync/openprotein-api --only=embeddings
```

`--env dev|prod` (default `dev`) · `--ref <git-ref>` (default
`origin/spec-sync/openprotein-api`) · `--only id,id` · `--check` · `--help`. Unknown flags, an
unknown `--env`, an unknown `--only` id and an empty `--only` all exit 1 with usage.

> **Use the `--flag=value` form.** `take()` does a bare `rest.shift()` with no lookahead
> (`:187`), so `--ref --check` sets `ref = '--check'` and loses the flag, and `--only --check`
> errors with `unknown id --check`.

> **`--env prod` is not a usable mode.** Prod's prompt endpoint returns 403, so the failure
> gate at `:488` exits 1 before anything is written — it cannot regenerate even the eight
> specs that build fine. Worse: `--env prod --only <ids not including prompt>` **passes the
> gate and silently overwrites the committed dev output with prod bytes** (`assaydata`
> 37155 B vs 37187, `align` 63870 vs 70730, `auth` 24628 vs 24660). Nothing in the file
> records which environment produced it. The committed specs are always dev-built.

## Where each document comes from

`SPECS` (`:154`) is the whole routing table. Three sourcing modes:

| id | kind | source | filter |
|---|---|---|---|
| `fold` | snapshot | `source/_static/js/foldSpec.js` at `--ref` | — |
| `design` | snapshot | `designSpec.js` | — |
| `predictor` | snapshot | `predictorSpec.js` | — |
| `embeddings` | snapshot | `embeddingsSpec.js` | — |
| `prompt` | live | `<origin>/api/v1/prompt/openapi.json` | `dropPaths` regex |
| `assaydata` | live | `<origin>/openapi.json` | `ALLOW.assaydata` |
| `align` | live | `<origin>/openapi.json` | `ALLOW.align` |
| `auth` | live | `<origin>/openapi.json` | `ALLOW.auth` |
| `models` | live | `<origin>/openapi.json` | `prefix: '/api/v1/models'`, `allowEmpty` |

**snapshot** reads a vendored JS module out of a git ref with
`git show <ref>:source/_static/js/<module>.js`, strips `const xSpec = ` and
`export default xSpec;`, and evaluates the remainder with `new Function`. The snapshots are JS
object literals — unquoted keys, trailing commas — so `JSON.parse` cannot read them. Two
consequences:

- The strip regex has **no `m` flag**, so the declaration must be the first token of the file.
  If the bot branch adds a header comment or switches to `export const`, you get either the
  clean `is not a 'const <module> = {…}' module` error or a raw `SyntaxError` out of
  `new Function`.
- `loadSnapshot` **executes arbitrary JavaScript from a remote branch**. The branch is
  bot-updated; anything executable that lands in a `*Spec.js` runs with full Node privileges
  during a sync. Accepted tradeoff, but know it before pointing `--ref` at an untrusted ref.

The path the script reads — `source/_static/js/<module>.js` — exists only on the bot branch, so
the ref must be fetched. The working tree does contain `*Spec.js` copies under
`__old/source/_static/js/`, but they are the stale ones the script exists to stop tracking. A bad
ref fails with `cannot read source/_static/js/foldSpec.js at ref <ref> (git show …)`.

**embeddings is snapshot-sourced, not live.** Its live document returns
`403 RBAC: access denied` on dev *and* prod, and the old site's `swaggerEmbeddings.js` read the
vendored file rather than calling `getSwaggerJson`. Do not "fix" it to a live fetch.

**Do not switch `prompt` to a snapshot to dodge the prod 403.** The vendored `promptSpec.js`
on the ref is stale dead code — 3.0.2, 13 paths / 16 operations / 10 schemas / 4 tags, against
a live dev document of 3.1.0 / 12 paths / 3 tags. The old site fetched prompt live too
(`swaggerPrompt.js` calls `getSwaggerJson('prompt')`). Switching would regress content.

## Filters

`applyAllow` (`:298`) applies the path/schema/tag allowlists ported verbatim into `ALLOW`
(`:41`) from `__old/source/_static/js/getSwaggerJson.js`, then calls `closeSchemas` (`:277`), which grows
the kept-schema set until every `$ref` resolves and rebuilds `components.schemas` **in upstream
`source` key order** — not allowlist order. That ordering is load-bearing: `--check` compares
**raw strings** (`on !== r.json`, `:502`), so any reordering makes all three allowlisted specs
report stale with no semantic change.

Drift is reported four ways, all `WARN`, never a failure:

- `allowlisted path gone upstream: …`
- `allowlisted schema gone upstream: …` — the ported list is stale
- `allowlist missed N referenced schema(s), added: …` — **self-healed**; without this the page
  would render dangling `$ref`s, which is exactly what the old Swagger UI did
- `allowlisted but unreferenced: …` — **informational only; those schemas are still emitted.**
  `components.schemas` is built from the whole `keep` set (`:282`), so `assaydata` ships dead
  `Job`, `JobType`, `NMutationsCriterion` and `align` ships a dead `MSAMetadata` that upstream
  replaced with `app__schemas__job__MSAMetadata` (both are in the file).

`ALLOW.auth.schemas` contains the entry `'securitySchemes'`, which is not a schema name — a bug
inherited from the legacy `apiSchemasAuth`. The stale-schema warning carves it out explicitly
(`&& name !== 'securitySchemes'`, `:308`), so `auth` reports no drift for it. The real fix is
removing the bogus entry, not the carve-out.

`applyPrefix` (`:330`) keeps paths under a prefix, prunes `tags` to those the kept paths use,
and closes the schema set from empty.

## Patches, in order (`build`, `:395`)

1. `applyAllow` **or** `applyPrefix`
2. `dropPaths` — deletes matching paths, then prunes any tag no surviving operation uses.
   Nothing re-prunes **`components.schemas`** afterwards, so a drop can leave orphans. `prompt` is
   the only spec using `dropPaths`, and it has neither `allow` nor `prefix`, so `closeSchemas`
   never runs for it at all — its 9 schemas are simply whatever upstream sent. Nothing is actually
   orphaned today: the 5 dropped paths only referenced schemas still in use, so all 9 remain
   reachable by transitive `$ref` from the 7 emitted paths. The "drop happens after closure"
   ordering only starts to matter if a future entry combines `dropPaths` with `allow`/`prefix`.
3. `patchServers` — sets `servers` to dev + prod. **Required**: the vendored specs declare
   none, so every request URL would resolve against the docs origin. This is what the old
   site's `getBackendUrl.js` / `getEnvironment.js` were compensating for by sniffing
   `location.href`.
4. `patchTokenUrl` — rewrites every `flows.password.tokenUrl` to `/api/auth/login`.
   **Required**: fumadocs fetches `tokenUrl` verbatim and does *not* route it through
   `proxyUrl`, so an upstream value would have the browser POST credentials straight to the
   platform. It touches **only the `password` flow** — `HTTPBearer` is correctly skipped, but a
   future `clientCredentials` or `authorizationCode` flow would keep an upstream URL and
   `validate()` would not notice.
5. `repairExternalRefs` — replaces any non-`#` `$ref` with
   `#/components/schemas/UnresolvedExternalSchema` (a permissive `object`) and warns. fumadocs
   dereferences up front and **fails the build** on a dangling external ref; Swagger UI
   silently rendered an empty stub.
6. `validate` (`:378`) — hard failures: missing `info.title`, no `openapi`/`swagger` version,
   empty `paths` (unless `allowEmpty`), any external or unresolvable `$ref`, `servers` not
   patched. Any failure exits 1 and nothing is written.

Two of `validate`'s branches are **dead code**: `repairExternalRefs` runs immediately before it
and rewrites every external `$ref`, and `patchServers` unconditionally assigns `SERVERS`. They
are defensive only — do not rely on either to catch a regression, and do not assume the
pipeline order is safe to shuffle.

Output is `JSON.stringify(spec, null, 1)` plus a trailing newline. **Keep it exactly that**:
changing the indent or dropping the newline invalidates all nine committed files at once.

## Current state, verbatim from `pnpm check:specs`

```
ref origin/spec-sync/openprotein-api  env dev (https://dev.api.openprotein.ai)  9 specs

WARN  fold        17 paths  40 schemas  9 tags   87205 B  foldSpec.js@origin/spec-sync/openprotein-api
ok    design      10 paths  39 schemas  2 tags   67104 B  designSpec.js@…
ok    predictor   14 paths  35 schemas  1 tags   51215 B  predictorSpec.js@…
ok    embeddings  90 paths  22 schemas 38 tags  292033 B  embeddingsSpec.js@…
WARN  prompt       7 paths   9 schemas  2 tags   32999 B  api/v1/prompt/openapi.json
WARN  assaydata    5 paths  16 schemas  1 tags   37187 B  openapi.json
WARN  align       11 paths  22 schemas  3 tags   70730 B  openapi.json
WARN  auth         3 paths   9 schemas  2 tags   24660 B  openapi.json
WARN  models       0 paths   0 schemas  0 tags    3503 B  openapi.json

--check: all 9 spec(s) match the committed output.
```

Every WARN is expected and understood:

| spec | warning | meaning |
|---|---|---|
| `fold` | repaired dangling `./Property.yaml` at `Boltz2Request/properties/properties/items` | upstream generator never bundled it; Boltz-2's `properties` field is genuinely undocumented |
| `prompt` | dropped 5 `/api/v1/prompt/<uuid>` paths | seeded DB rows, not API surface — freezing dev's UUIDs would publish prod 404s |
| `assaydata` | 22 gone, 8 added, 3 unreferenced | ported allowlist is stale; renames like `Body_create_assay_data_assaydata_post` → `…_api_v1_assaydata_post` |
| `align` | 5 gone, 6 added, 2 unreferenced | same |
| `auth` | 1 added (`Body_login_access_token_api_v1_auth_login_post`) | same |
| `models` | no paths matched | `/api/v1/models` is not deployed — see below |

Declared OpenAPI versions are mixed: `design`, `embeddings`, `fold`, `predictor` are 3.0.2;
`align`, `assaydata`, `auth`, `models`, `prompt` are 3.1.0. fumadocs normalises everything to
3.2 in memory at load (see `library.md`).

`securitySchemes` differ by document: the four snapshots carry `oauth2`; the four sliced out of
the main `openapi.json` (`assaydata`, `align`, `auth`, `models`) carry `OAuth2PasswordBearer` +
`HTTPBearer`; and `prompt` — live, but fetched from its own `/api/v1/prompt/openapi.json` —
carries `OAuth2PasswordBearer` alone. Pre-patch `tokenUrl` was `/api/v1/auth/login` everywhere except `prompt`, which had
`/api/v1/login/access-token`.

**`fold` declares 9 tags but its operations use 10.** `POST /api/v1/fold/models/minifold` is
tagged `['fold requests','minifold']` and `minifold` is not in `spec.tags`. Snapshots get no
allow/prefix treatment so nothing reconciles tags, and `validate()` does not check tag
consistency at all. `buildEndpointTree` handles it (undeclared tags sort last) but the section
gets **no description**, because descriptions come only from `document.tags[]`. To fix a
missing section description, add the tag to the spec's top-level `tags` array upstream — that
also gives it a real sort order instead of `1e6`. `fold` is the only spec with this mismatch.

## `models` is empty on purpose

`/api/v1/models` exists on neither backend (dev publishes 78 paths, prod 68; none contain
"model"). `models.rst` documented five endpoints in prose that the API does not publish, so the
*old* site's Models page was an empty Swagger box too. `allowEmpty: true` is what keeps the run
from failing; drop it and `validate()` pushes `paths is empty`, exits 1, and **blocks the other
eight specs from being written**. `components/api-page.tsx` renders "This service publishes no
endpoints yet." Worth reporting upstream; do not delete the page.

## Adding a tenth spec

1. Add a row to `SPECS`. Snapshot needs `module`; live needs `url(origin)` and usually `allow`
   (add the key to `ALLOW`) or `prefix`.
2. Add a row to `REST_API_PAGES` in `lib/openapi.ts` — `{ slug, id, title }`. `id` must equal the
   `SPECS` id and the filename stem; `slug` must equal the `.mdx` filename. **Nothing reads the
   row order** — the `input` map is keyed by `id` and `specIdForSlug` is a `.find` — so keeping it
   aligned with `meta.json` is convention only; the sidebar order comes from `meta.json` in step 3
   and the sidebar label from the `.mdx` frontmatter `title`, leaving the row's own `title`
   unread.
3. Create `content/docs/rest-api/<slug>.mdx` with `openapi: <id>` frontmatter, and add `<slug>`
   to `content/docs/rest-api/meta.json`'s `pages`.
4. `pnpm sync:specs`, restart `pnpm dev`, then `pnpm check:specs && pnpm build && pnpm check:restapi`.

`SpecId` and `RestApiSlug` are derived from `REST_API_PAGES` with `as const`, so step 2 makes
the rest typecheck.

**`SPECS` and `REST_API_PAGES` must stay in bijection.** `readSpec` is a bare
`JSON.parse(readFile(...))` with no fallback, so a page id with no synced file throws ENOENT
while rendering that route; a synced file with no page is dead weight. Also note
`lib/openapi.ts` builds `SPEC_DIR` from `process.cwd()` while the script builds `OUT_DIR` from
its own URL — so the script works from any cwd, but **the Next process must run from the repo
root**.

## Do not

- Hand-edit `specs/*.openapi.json`. `pnpm check:specs` fails and the next sync reverts it.
- Fetch a spec at build or request time. The build stays offline and every page prerenders.
- Add a PoET REST page. `getSwaggerJson.js` still defines `apiPathPoet` (7 paths:
  `/api/v1/poet/{score,single_site,add_sequences,generate,add_generate,inputs,metadata}`),
  `apiSchemasPoet` (28 names) and `apiTagsPoet`, but there was never a `rest-api/poet.rst`. The
  migration reaches parity, it does not add sections.
