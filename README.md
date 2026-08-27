# OpenProtein.AI documentation

The docs site at `docs.openprotein.ai` — Next.js 16 + Fumadocs 16, replacing the Sphinx site that
lived here until the Phase 10 cutover (`git show b66e546:__old/` for the originals).

Every page is public and prerendered; only `/api/**` and `/login` need a server.

```bash
pnpm install
pnpm dev            # http://localhost:5001
pnpm build && pnpm start
```

`.env.example` lists the environment. Nothing is required for the docs themselves — the platform
API URL and `DOCS_SESSION_SECRET` matter only for login and the REST playground, and
`NEXT_PUBLIC_GA_ID` only for analytics.

## Layout

| path | what |
|---|---|
| `content/docs/**.mdx` | the prose, plus `meta.json` per folder for sidebar order |
| `content/notebooks/**.ipynb` | 33 notebooks, rendered by a wrapper page |
| `specs/*.openapi.json` | 9 REST specs, committed |
| `specs/openprotein.*.json` | 16 Python API documents, committed |
| `public/_static/**` | images at their original URLs |
| `lib/`, `components/` | renderers: MDX, notebook, REST, Python API, auth |
| `proxy.ts` | every old `.html` URL, 301'd |

## Adding things

**A page.** Write `content/docs/<section>/<name>.mdx` with `title` and `description`, then add
`<name>` to that folder's `meta.json` — the sidebar is explicit, not alphabetical. Keep heading
text stable: anchors come from it and old deep links depend on them.

**A notebook.** Drop the `.ipynb` under `content/notebooks/<section>/`, then
`node scripts/seed-notebooks.mjs` to write its wrapper page. **The filename is the URL** — do not
rename to kebab-case.

**A REST spec.** Add it to `REST_API_PAGES` in `lib/openapi.ts` and to `scripts/sync-specs.mjs`,
run `pnpm sync:specs`, and write the page with `openapi: <id>` frontmatter.

**A Python API class.** Add it to `scripts/pyapi/pages.json`, run `pnpm sync:pyapi`, restart
`pnpm dev` (nothing watches `specs/`), and add `<PyClass path="…" />` plus the path in the
enclosing `<PyGroup anchors={[…]}>`.

The two reference subsystems have skills with the full detail: `.claude/skills/op-docs-rest-api`
and `.claude/skills/op-docs-python-api`.

## Regenerating

`specs/` is committed, so a normal build needs no Python. Regenerating the Python API does:

```bash
pixi install && pixi run venv     # pins Python 3.13 + griffe + the SDK
pnpm sync:pyapi
```

## Checks

```bash
pnpm types:check          # next typegen && tsc --noEmit
pnpm build                # must be warning-free
pnpm check:mdx            # every page compiles as MDX
pnpm check:content        # every page renders in Chrome, no console errors, no RST leakage
pnpm check:urls           # all 112 old .html URLs 301 to a 200, + surfaces and deep fragments
pnpm check:links          # asset references and internal links
pnpm check:pyapi          # specs/ is current
pnpm diff:pyapi           # members, order, signatures and types vs what Sphinx published
pnpm check:pyapi:render   # the 12 reference pages, in Chrome
pnpm verify:pyapi:pin     # the wheel is still the tree the [source] line numbers came from
pnpm check:specs          # committed REST specs match upstream
pnpm check:restapi        # the 9 REST pages, in Chrome
pnpm check:contrast       # brand tokens ≥ 4.5:1 in both themes
pnpm check:layout         # header/sidebar/content geometry
pnpm check:auth           # login round trip; skipped unless OP_TEST_USER/OP_TEST_PASS are set
```

The browser checks need a server: `pnpm dev`, or `pnpm build && pnpm start` with
`BASE=http://localhost:5011`.

## Deployment

Out of scope here. CI installs, typechecks and builds; there is no deploy step. Every doc page is
prerendered, so a static host plus a small server for `/api/**` is enough.
