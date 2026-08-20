# Verifying a change

## The commands

| command | covers | needs |
|---|---|---|
| `pnpm types:check` | `next typegen && tsc --noEmit` | — |
| `pnpm build` | must be warning-free; also proves every `$ref` bundles and all nine pages prerender | — |
| `pnpm check:specs` | rebuilds all nine specs in memory, fails if `specs/` has drifted | network + the bot ref |
| `pnpm sync:specs` | writes them | network + the bot ref |
| `pnpm check:restapi` | the nine rendered pages, in Chrome | dev server on `:5001` |
| `pnpm check:auth` | login/logout round trip | dev server + `OP_TEST_USER`/`OP_TEST_PASS` |
| `pnpm check:layout` | header/sidebar/footer geometry | dev server |
| `node scripts/check-links.mjs` | asset and internal-link references | no npm alias exists |

`pnpm dev` serves on **5001** (`--port ${PORT:-5001}`); other ports have been blocked in this
environment. Every Playwright script defaults to `http://localhost:5001` and honours `BASE`.

Run order after touching a spec: `sync:specs` → **restart `pnpm dev`** (see `library.md`:
`getSchema` caches per process and nothing watches `specs/`) → `check:specs` → `build` →
`check:restapi`.

### Environment caveats

- All three Playwright scripts use `chromium.launch({ channel: 'chrome' })` — **the system
  Google Chrome**, not Playwright's bundled browser. On an image without Chrome they die before
  the first assertion.
- **`timeout` is not available** in this shell (zsh on darwin); `timeout N pnpm check:restapi`
  fails with "command not found". Use the tool timeout instead. A full nine-page run finishes
  well inside a couple of minutes against a warm dev server.
- `check:specs` is **not offline-runnable**: it fetches `dev.api.openprotein.ai/openapi.json`
  and `…/api/v1/prompt/openapi.json`, and runs `git show origin/spec-sync/openprotein-api:…`.
  Without network or that ref it fails for reasons unrelated to the page code.
- `check:auth` **passes silently** with no credentials (`skipped: …`, exit 0). In CI it is a
  green no-op unless real platform credentials are supplied.
- `check:layout` does **not** cover a REST page by default (targets are `/getting-started`, `/`,
  `/web-app`). Use `node ./scripts/geom.mjs /rest-api/embeddings`.
- `check:contrast` parses the **first** `:root` and first `.dark` block of `app/global.css` with
  `new RegExp(selector + '\\s*\\{([^}]*)\\}')`. That pattern matches three `:root` blocks and
  two `.dark` blocks (the `.dark #nd-sidebar` and `.dark .prose-no-margin .shiki` rules never
  match — it requires `{` immediately after the selector). Moving a `--brand-*` token out of the
  first block, or nesting a block inside it, makes the script report `token not found` and
  exit 1.
- `scripts/check-links.mjs` lists `rest-api` in its `UNMIGRATED` set, so a broken
  `/rest-api/...` route downgrades to a **warning**, not a failure. It also skips any href that
  does not start with `/`, which is why the three dangling `./*.rst` links go unreported.

## `scripts/check-restapi.mjs`

`pnpm check:restapi` checks all nine; `node scripts/check-restapi.mjs fold embeddings` checks a
subset. Exit 1 on any failure, one `FAIL <reason>` line each.

Per page it prints the shape line, expands the first three endpoint rows, prints what that
exposed, and asserts:

| assertion | why it exists |
|---|---|
| a `[data-rest-api]` root exists | catches the renderer falling back to the flat layout |
| endpoint rows > 0 and tag sections > 0 | catches grouping silently producing nothing |
| every tag section is open | sections are open-by-default; a regression here hides the page |
| every endpoint row is collapsed | `aria-expanded="false"` on all of them |
| zero **visible** `[role="region"]` panels | no endpoint body is visible before a click. The count filters on `offsetParent !== null`, so a body mounted-but-hidden would also pass — it cannot prove laziness, though in practice no panel is mounted at all |
| no visible text inside the tree equals `cURL`, `JavaScript`, `Go`, `Python`, `Java`, `C#`, `Rust` | the "no code snippets" requirement |
| zero `[data-type="authorization"]` elements | the playground auth panel is gone |
| every `#nd-toc a[href^="#"]` resolves to **exactly one** element | the anchor contract — catches server/client tree drift and any anchor collision |
| the three expanded rows all open, all render a playground, and still show no language tabs | |
| zero **visible** `button:has(> svg.lucide-link)` **after expanding** | the CSS that hides the non-unique anchor buttons is still in effect |
| a fresh load on `…#<row-id>` arrives expanded and scrolled into view (`-20 ≤ top ≤ 400`) | the `useHashTarget` + rAF path |
| zero console errors | |
| zero requests to any `openprotein.ai` host | proves everything goes through the proxy |

`models` is special-cased: with an empty spec there is no `[data-rest-api]` root, so instead it
asserts the page says "publishes no endpoints yet".

### Three things this script gets right only because they were fixed

These were live defects and are worth knowing, because the same mistakes are easy to reintroduce:

1. **The language detector is scoped to `[data-rest-api]`.** Unscoped, any visible element whose
   entire trimmed text is exactly `Go`, `Rust`, `Java`, `C#`, `Python`, `JavaScript` or `cURL` —
   a nav item, a table cell, a bullet — trips `code sample tabs present: …`.
2. **The anchor-button assertion runs *after* expanding.** Computed pre-click it was vacuous:
   with every body unmounted there are zero such buttons, so deleting the CSS rule still gave
   "all checks passed". Proven non-vacuous by commenting the rule out — it then reports
   `FAIL 4 non-unique schema anchor buttons visible` on `/rest-api/fold`.
3. **TOC anchors are counted from one pass over every `[id]`, not via an attribute selector.**
   The old `CSS.escape(id).replace(/\\/g, '')` stripped the escapes it had just added; for an id
   starting with a digit, `CSS.escape('1x')` is `\31 x`, which became `31 x` — so a present
   anchor would have been reported unresolved.

**The detector is only meaningful if it can see things.** Sanity-checked on `/rest-api/fold`
with the script's own walker over `[data-rest-api]`: 80 visible text nodes including `POST`
before expanding, 183 after expanding three rows, with `Send` present and `cURL`/`Python`
absent. Re-run that check if you change the operation layout.

Row detection is `h3[id],h4[id],h5[id]` inside `[data-rest-api]` containing a
`button[aria-expanded]` whose id does **not** end in `-endpoint` — that suffix is what separates
a tag section from an operation row. Section heading levels change with nesting depth, so any
selector here has to cover h2–h5.

## Expected output

```
/authentication-and-jobs: 2 tags (2 open), 5 endpoints (5 collapsed), 13 toc, 0 panels open
  expanded 3: 19 vendor anchor buttons (0 visible), 3 duplicated ids
/assay-datasets: 1 tags (1 open), 8 endpoints (8 collapsed), 10 toc, 0 panels open
  expanded 3: 11 vendor anchor buttons (0 visible), 3 duplicated ids
/models: 0 tags (0 open), 0 endpoints (0 collapsed), 1 toc, 0 panels open
/align: 3 tags (3 open), 11 endpoints (11 collapsed), 14 toc, 0 panels open
  expanded 3: 14 vendor anchor buttons (0 visible), 4 duplicated ids
/prompt: 2 tags (2 open), 10 endpoints (10 collapsed), 12 toc, 0 panels open
  expanded 3: 7 vendor anchor buttons (0 visible), 3 duplicated ids
/embeddings: 34 tags (34 open), 93 endpoints (93 collapsed), 127 toc, 0 panels open
  expanded 3: 4 vendor anchor buttons (0 visible), 2 duplicated ids
/fold: 10 tags (10 open), 17 endpoints (17 collapsed), 27 toc, 0 panels open
  expanded 3: 4 vendor anchor buttons (0 visible), 2 duplicated ids
/predictor: 1 tags (1 open), 16 endpoints (16 collapsed), 17 toc, 0 panels open
  expanded 3: 14 vendor anchor buttons (0 visible), 3 duplicated ids
/design: 2 tags (2 open), 10 endpoints (10 collapsed), 12 toc, 0 panels open
  expanded 3: 13 vendor anchor buttons (0 visible), 3 duplicated ids

all checks passed
```

Endpoint counts equal the specs' operation counts exactly: 5+8+0+11+10+93+17+16+10 = **170**. If
a number moves, either a spec changed or grouping is dropping something.

TOC counts exceed `tags + endpoints` on pages whose MDX prose has its own headings
(`authentication-and-jobs` 13 vs 7, `assay-datasets` 10 vs 9). `fold` is 27 = 10 + 17 exactly,
because that page has no prose headings.

`duplicated ids` is informational and **expected to be non-zero** with two or more bodies open —
that is the upstream `#request-body` / `#response-body` defect, contained rather than fixed.

## Manual checks worth doing

- **Both themes.** `MethodLabel` and the endpoint card use `dark:` utilities. They are
  class-based here (`fumadocs-ui/css/lib/base.css:275` declares
  `@variant dark (&:where(.dark, .dark *))`), so they follow the theme switcher — confirm after
  any token change.
- **The deepest branch.** `/rest-api/embeddings`, `Community-based → Antibody → Ablang2` is the
  only three-level nesting; it is where heading-level clamping and TOC `MAX_DEPTH` bite.
- **Long paths in the TOC.** `/embeddings/models/rotaprot-large-uniref90-ft/logits` should wrap
  after a `/`, never mid-segment.
  `[...document.querySelectorAll('#nd-toc a')].filter(a => a.scrollWidth > a.clientWidth + 1)`
  must be empty (measured: 0 of 129 on `embeddings`).
- **Playground, signed in.** Network tab: only same-origin `/api/playground-proxy?url=…`, and no
  `Authorization` header leaving the browser.

## Extending the check script

Add to the `page.evaluate` calls and assert on the returned object — keep the browser-side code
dependency-free. Write the failure message as *what broke*, not what was expected, so a red line
is self-explanatory. If you add a page, add its slug to `SLUGS`. And before trusting a new
assertion, break the thing it guards and confirm it goes red.
