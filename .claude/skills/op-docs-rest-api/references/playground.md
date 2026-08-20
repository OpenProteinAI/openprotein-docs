# The playground and its security model

## The path a request takes

```
browser: Send
  → POST /api/playground-proxy?url=<upstream>          (same-origin, session cookie attached by the browser)
      app/api/playground-proxy/route.ts
        getSession()                                   decrypt op_docs_session (JWE)
        isExpired(session) → refresh once, re-seal, remember the rotated cookies
        openapi.createProxy({ allowedOrigins, overrides })
          overrides.request  → delete cookie, delete x-forwarded-for, set Authorization
          overrides.response → application/json5 → application/json
  → upstream https://dev.api.openprotein.ai/api/v1/…
```

The bearer token exists only server-side. The browser never sees it, never stores it, and
never sends an `Authorization` header of its own.

## The lockdown — `components/api-page.tsx`, `playground:`

```ts
playground: {
  transformAuthInputs: () => [],
  fetchOptions: { proxyUrl: PROXY_URL, proxyForwardCookie: false, requestTimeout: false },
  components: {
    CollapsiblePanel: (props) =>
      props['data-type'] === 'authorization' ? null : <DefaultCollapsiblePanel {...props} />,
  },
}
```

### `transformAuthInputs: () => []` is the load-bearing control

Traced in `node_modules/fumadocs-openapi/dist/playground/client.js`. `useAuthInputs` builds
one `input` per security scheme, each carrying a `storageKey`. Then:

| line | what it does |
|---|---|
| `:445` | `if (transformAuthInputs) inputs = transformAuthInputs(inputs)` |
| `:452`, `:467` | `localStorage.setItem(item.storageKey, JSON.stringify(value))` — the writer |
| `:475` | `mapInputs(values)` — merges auth values into the outgoing request |
| `:483-485` | `initAuthInputs()` — `localStorage.getItem(item.storageKey)`, restoring a stored value |

Returning `[]` at `:445` empties the list before all four. Nothing is written, nothing is
restored, and `mapInputs` contributes no auth values. Without it, a platform bearer token
typed into the panel would sit in `localStorage`, turning any XSS on the docs origin into
full credential theft.

**The `CollapsiblePanel` override is cosmetic only.** `useAuthInputs` runs in the parent
whether or not the panel renders, so the override alone would still let `initAuthInputs()`
restore a bearer from `localStorage` and `mapInputs` attach it — with no visible UI at all.
Both are needed and neither is redundant: one is the control, the other stops a collapsible
section that opens onto nothing.

The same override renders every other panel (Body, and the path/query/header/cookie
parameter groups), so it cannot simply return `null`.

**Do not use `playground.provider` for this**, despite its JSDoc suggesting it: that option
*replaces* the built-in `AuthProvider`, `useAuth()` then throws, and `AuthProvider` is not
exported so it cannot be re-provided.

### `fetchOptions`

| option | library default | here | why |
|---|---|---|---|
| `proxyUrl` | none | `/api/playground-proxy` | without it the browser calls the platform directly and CORS/auth both fail |
| `proxyForwardCookie` | **`true`** | `false` | **required for the playground to work at all** — see below |
| `requestTimeout` | `10` (seconds) | `false` | platform job submissions routinely take longer, and a timeout reads to the user as a broken endpoint |

**`proxyForwardCookie: false` is not about leaking the cookie upstream.** The in-code comment
that said so was wrong and has been corrected. What the default (`true`) actually does is set
`credentials: 'omit'` on the browser's request to *our own* proxy — so `op_docs_session` never
arrives, `getSession()` returns `null`, and every Send answers 401 "Sign in to run requests
against the API." for a signed-in reader, with an error message pointing at the wrong cause.
The leak it appears to describe cannot happen: JS cannot read an httpOnly cookie, the fetcher
serialises only spec-declared cookie *parameters* into `?cookie=`, and `attach()` deletes the
header the library derives from it regardless.

`renderOperationLayout` also drops `slots.authSchemes` — the "Authorization" documentation
block. It describes a header the reader cannot set here, so it is noise.

## `tokenUrl` — the one thing `proxyUrl` does not cover

fumadocs fetches `securitySchemes.*.flows.password.tokenUrl` **verbatim** and does not route it
through `proxyUrl`. `scripts/sync-specs.mjs` rewrites every one to `/api/auth/login`, our own
route.

Today that is **defence in depth, not the active control**. The only code that performs the fetch
is the OAuth dialog (`playground/components/oauth-dialog.js`, `type === "password"`), reached only
through `OAuth2Input` — an auth input's `children` — so `transformAuthInputs: () => []` already
stops it mounting. Remove the rewrite *and* let the auth inputs back, and the browser POSTs
credentials straight to the platform origin. The one `tokenUrl` fetch independent of `inputs` is
the `authorizationCode` handler in `playground/auth.js`, and no spec declares that flow. See
`pipeline.md`.

## The proxy route — `app/api/playground-proxy/route.ts`

`export const dynamic = 'force-dynamic'` — the bearer comes from a per-request cookie, so
nothing here may be prerendered or cached. One `handle` function is exported as
**GET, HEAD, PUT, POST, PATCH, DELETE**.

- **Anonymous → 401** with `Sign in to run requests against the API.` Signed in and
  unrefreshable → 401 with the "session expired" message.
- **Refresh before forwarding**, not after a 401 comes back: `isExpired(session)` (30s margin,
  `EXPIRY_MARGIN_MS` in `lib/session.ts`) triggers exactly **one** refresh attempt per
  request, because platform refresh tokens are single-use and rotating — a concurrent replay
  revokes the whole token family. Rotated `Set-Cookie` headers are merged onto the response
  by `withRotatedCookies`, and `csrf` falls back to the old value because refresh often omits
  it (dropping it would leave the *next* refresh unauthenticated).
- **Built per request**, not at module scope: `overrides.request` is synchronous and so cannot
  `await cookies()` itself.
- **Header hygiene, in this order**: `delete cookie` → `delete x-forwarded-for` →
  `set Authorization`. The shipped proxy forwards every inbound header plus any
  attacker-supplied `?cookie=`, so deleting comes first.
- **Body is handed over as a stream** — `body: request.body` with `duplex: 'half'`, which undici
  requires to construct a `Request` from a stream. `RequestInit` has no `duplex` in the DOM lib,
  hence the local `StreamInit` type. Nothing actually streams to upstream: `createProxy` buffers
  the body twice — `await request.arrayBuffer()` in `rewriteRequest`, *before* `overrides.request`
  runs, so `attach()` never sees the client's live stream, and `await initial.arrayBuffer()` in
  `proxyFetch` before each upstream `fetch`. A large playground body is fully resident in memory.
- **`application/json5` → `application/json`** on the way back, which is what the old site's
  Swagger `responseInterceptor` did.
- **`allowedOrigins`** comes from `ALLOWED_API_ORIGINS` in `lib/env.ts` — derived from
  `OP_SERVER_PROXY` plus the two known platform origins, never hardcoded, so repointing the
  env cannot silently break the playground. `createProxy` enforces it across redirects, up to
  20 hops; since 11.2.2 omitting it falls back to same-origin-only with a warning.

## What is observable

In devtools a reader sees only same-origin `/api/playground-proxy?url=…` requests, each carrying
the **operation's own** HTTP method — which is why six handlers are exported; the shipped specs
exercise GET, POST, PUT and DELETE — with the docs session cookie (httpOnly, so unreadable from
JS) and **no** `Authorization` header.
Measured across all nine pages: 0 auth inputs rendered, **0 requests to any
`openprotein.ai` host**.

An attacker with XSS on the docs origin can invoke the proxy as the signed-in user — that is
inherent to any session-cookie design — but cannot **exfiltrate** the token: it is inside a
`dir`/`A256GCM` JWE in an httpOnly cookie and is never placed in the DOM, in `localStorage`,
or in a response body. `/api/auth/login` returns only `{ username }`.

## Related session machinery

`lib/session.ts` — `op_docs_session`, JWE (`alg: 'dir'`, `enc: 'A256GCM'`, key from
`DOCS_SESSION_SECRET`), httpOnly, `sameSite: 'lax'`, 7-day maxAge. `getSession` and
`getPublicSession` are wrapped in React `cache()` so there is one decrypt per render pass;
`getPublicSession` returns `{ username, expiresAt }` only.

`lib/platform-auth.ts` — hardcodes the canonical `'Bearer'` scheme (the platform returns
`token_type: "bearer"` and the gateway 401s the lowercase form), and re-scopes the platform's
`op_refresh`/`op_csrf` cookies: `Domain` stripped, `Path` rewritten to `/api/auth`, `Secure`
dropped off production.

Verify the whole round trip with `OP_TEST_USER=… OP_TEST_PASS=… pnpm check:auth`.


## Sharp edges and residual risk

Stated plainly, because the security story is the reason this subsystem is shaped the way it is.

**The in-route refresh can essentially never succeed.** `localiseSetCookie` forces
`Path=/api/auth` on every platform cookie, and `/api/playground-proxy` is not under that path —
so `req.headers.get('cookie')` carries `op_docs_session` but **not** `op_refresh`. The
`refresh()` call at `route.ts:77` therefore posts with no refresh token, throws, and returns the
STALE 401. In practice it is masked by `SessionRefresher`, which refreshes 60 s earlier through
`/api/auth/refresh` — a path that *does* receive the cookie. It surfaces when the poller has
stopped (three failed retries), the tab was backgrounded past the deadline, or the poller is not
mounted: the playground says "sign in again", the header still says you are signed in, and the
next Send after the poller's next tick succeeds. Note also that this branch does **not** clear
`op_docs_session`, unlike `/api/auth/refresh`, which does.

**Upstream `Set-Cookie` passes through unmodified.** Every other route launders platform cookies
through `localiseSetCookie`; the proxy's `rewriteResponse` copies upstream headers verbatim
except `content-encoding`/`content-length`/`access-control-*`, and `withRotatedCookies` only
*appends*. `specs/auth.openapi.json` exposes `POST /api/v1/auth/login` **with no security**, so a
reader can run it from the playground and the platform's raw
`Set-Cookie: op_refresh=…; Domain=.openprotein.ai; Path=/; Secure; HttpOnly` comes back from the
docs origin. On a docs host under `*.openprotein.ai` the browser accepts it at `Path=/`,
installing a stray platform refresh cookie that is then sent on every docs request.

**There is no path or method restriction — only an origin allowlist.** `filterRequest` (the 403
branch in `proxy.js`) is not configured, so any authenticated reader, or any script running on
the docs origin, can send any method to any path on dev/prod `api.openprotein.ai` with the
victim's bearer attached, destructive `DELETE`s included. This is the whole residual XSS surface.
The mitigation, if wanted, is a `filterRequest` checking `new URL(request.url).pathname` against
the union of paths in the nine specs.

**Cross-environment token forwarding is permitted.** Every spec lists **dev first** in `servers`,
`ServerProvider` picks `servers[0]`, and `ALLOWED_API_ORIGINS` always contains both known
platform origins in addition to the `OP_SERVER_PROXY` origin. A docs deployment configured with
`OP_SERVER_PROXY=https://api.openprotein.ai` mints production tokens and will attach them to
requests aimed at `dev.api.openprotein.ai` for any reader who never touches the server selector,
and vice versa. If that is unacceptable, narrow the allowlist to `PROXY_URL.origin` and
reconsider the server order in `sync-specs.mjs`.

**Header stripping is a denylist, and it is incomplete.** `attach()` removes `cookie` and
`x-forwarded-for`. Verified to survive to the upstream socket: `referer`, `sec-fetch-*`,
`user-agent`, `accept-language`, `cache-control`, `content-length`. So the docs page URL is
disclosed to the API, and on hosts that add `x-real-ip`, `x-vercel-ip-*`, `true-client-ip` or
`cf-connecting-ip` the reader's IP still gets through. Full IP hygiene would need an allowlist
(keep `content-type`/`accept`, drop the rest).

**`createProxy` drops bodies that arrive without a `content-length`.** `rewriteRequest` gates on
`contentLength && parseInt(contentLength) > 0`, so a chunked or streamed POST is forwarded
body-less. Nothing is "emptied": with `content-length` absent the `await request.arrayBuffer()`
on the right of the `&&` never evaluates, so the inbound body is never read — `attach()` is simply
handed a proxied Request constructed with no body and holds no reference to the original, which is
why the loss is unrecoverable there. Not observed today (a browser `fetch` of a string or blob sets
`content-length`), but a real edge for large playground bodies.

**One `localStorage` writer survives `transformAuthInputs: () => []`.** `client.js:456-470`
writes `localStorage.setItem(storageKeys.AuthField(schemeId), JSON.stringify(token))` when the
auth store updates and no matching input exists. It is fed only by `AuthProvider`'s URL
handlers, which bail unless the named scheme has `flows.authorizationCode` or `flows.implicit`.
All nine specs are password-flow only, so it is dead — but add an implicit or
authorization-code flow to any spec and a crafted docs link
(`#access_token=…&state={"scheme":"oauth2",…}`) can plant a token in `localStorage`. It would
still never be *sent*, because `initAuthInputs` iterates the empty array.

**Library-level proxy errors are a bare JSON string, not `{ error }`.** The route's own failures
are `{"error":"…"}` with 401; the library's are `Response.json("[Proxy] …")` with 400/500/508.
A body reading `"[Proxy] The origin … is not allowed."` means the allowlist; `"[Proxy] A \`url\`
query parameter is required…"` means the fetcher ran without `proxyUrl`.

**`OPTIONS` must stay unexported.** With no `OPTIONS` export Next *auto-implements* it — the
route answers `204 No Content` with `allow: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT`, not
405. That response carries no `access-control-allow-origin`, and **that missing header is the
actual defence**: a cross-origin preflight fails. Adding an `OPTIONS` handler that answers
preflights with CORS headers would remove it and open the proxy to cross-origin XHR, whose only
remaining defence is the `SameSite=Lax` cookie. Conversely, dropping any of the six exported
methods breaks exactly the endpoints that use it while everything else looks fine.

**`next.config.mjs` also rewrites `/api/v1/*` on the docs origin straight to the upstream API,
unauthenticated.** It exists so the platform's httpOnly refresh cookie is first-party in dev. It
is a second, token-less path to the platform sitting next to the playground proxy, and the docs'
own `Path=/` cookies are forwarded to it. The playground never uses it — the fetcher always
sends the absolute spec server URL through `?url=`. Easy to confuse when debugging.

**`DOCS_SESSION_SECRET` must be ≥ 32 bytes.** `key()` throws below that. In `unseal()` the throw
is swallowed (returns `null`), so the playground degrades silently to a permanent "Sign in to run
requests" for everyone; login, by contrast, 500s at `seal()`. Rotating the secret invalidates
every outstanding session the same way.

**`lib/env.ts` now carries `import 'server-only'`**, matching `session.ts` and
`platform-auth.ts`. Before that, a client import would have silently inlined `undefined` for the
non-`NEXT_PUBLIC_` vars and fallen back to the dev defaults. Its `API_ORIGIN` and
`isAllowedApiOrigin` exports have no callers. Note `API_PROXY` keeps any path on
`OP_SERVER_PROXY` (`https://host/gateway` stays intact for `apiUrl`) while `API_ORIGIN` and
`ALLOWED_API_ORIGINS` drop it — so a proxy with a path prefix behaves differently for login than
for origin allow-listing.

**`specs/models.openapi.json` has zero operations**, so `/rest-api/models` renders the empty
state and exercises none of this machinery. It is useless as a proxy smoke test — use `fold`.
