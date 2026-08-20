# Verifying a change

## The commands

| command | covers | needs |
|---|---|---|
| `pnpm types:check` | `next typegen && tsc --noEmit` | — |
| `pnpm build` | must be warning-free; all 12 pages prerender (38 static pages total) | — |
| `pnpm sync:pyapi` | regenerate `specs/openprotein*.json` | `.venv-pyapi` + the installed SDK |
| `pnpm check:pyapi` | rebuilds in memory, fails if `specs/` has drifted | same |
| `pnpm diff:pyapi` | scores member sets, kinds, **order**, **signatures** and **documented types** against `golden/` | same |
| `pnpm upstream:pyapi` | rewrite `scripts/pyapi/UPSTREAM.md` — the SDK's own docstring defects | same |
| `pnpm check:pyapi:upstream` | fail if `UPSTREAM.md` has drifted | same |
| `pnpm verify:pyapi:pin` | re-prove the installed wheel is the tree the `[source]` line numbers came from | same; add `--online` to re-fetch from GitHub |
| `pnpm check:pyapi:render` | the 12 rendered pages, in Chrome | dev server on `:5001` |
| `python3 scripts/pyapi/fetch_golden.py --offline` | re-derive `golden/` from the cached HTML | — |
| `python3 scripts/pyapi/extract_manifest.py` | re-lift `pages.json` | `__old/` still present |

Order after touching the generator: `sync:pyapi` → **restart `pnpm dev`** → `check:pyapi` →
`diff:pyapi` → `build` → `check:pyapi:render`.

`diff:pyapi` is the one that catches a signature or type regression, and it is the only check
that reads `golden/`'s rendered signatures. Its bottom line must read `no unexpected drift`:

```
member sets: 61 exact / 61 classes   members 439 generated vs 439 rendered by Sphinx   kinds all match
member order: 60 match / 61   differs: openprotein.fold.FoldResultFuture
signatures & types: 484 exact / 501   3 overload-primary, 14 typed-beyond-sphinx   no unexpected drift
documented types: 657 exact / 679   7 docstring-stale, 15 griffe-tuple-normalised   no unexpected drift
```

The four named drift classes are expected and explained in `oracle.md`; anything else prints as
`sphinx:` / `ours:` pairs above the summary. `--diff` is **informational — it exits 0 even with
UNEXPECTED drift**, so read the two `no unexpected drift` lines rather than the exit code.

### Environment caveats

- **Python ≥ 3.10** (griffe's floor). The machine default `python3` is 3.9, so name the
  interpreter: `python3.13 -m venv .venv-pyapi`. `generate.py` exits early with this recipe if
  the version is too old. `.venv-pyapi/` is gitignored.
- **`.venv-pyapi` is currently built from `__old/.pixi/envs/default/bin/python`** (3.13.5), which
  disappears with `__old/` in Phase 10.
- **Editing `specs/` does not show up in `pnpm dev` until a restart.** The file is read with
  `readFile`, not imported, so nothing watches it; `readPyEntry` is `cache()`d per request but
  the dev server does not recompile.
- `check:pyapi:render` uses `chromium.launch({ channel: 'chrome' })` — the **system** Chrome, not
  Playwright's bundled browser.
- `sync:pyapi` prints ten griffe warnings about upstream SDK docstring defects on every run
  (eight sites; two of them warn twice). They are expected; see `oracle.md`.
- `fetch_golden.py` without `--offline` needs `docs.openprotein.ai`, which is being replaced.
  Prefer `--offline`.

## `scripts/check-pyapi.mjs`

`pnpm check:pyapi:render` checks all 12; `node scripts/check-pyapi.mjs fold embedding` checks a
subset. Exit 1 on any failure, one `FAIL <reason>` line each.

The cross-reference `universe` is built from **every** golden file regardless of the argument
list. It used to be built from the named pages only, so `fold data` reported 46 phantom
"cross-reference(s) point nowhere" — the documented subset invocation could not pass on a
healthy tree.

Per page it prints anchors / toc / badges / src / groups / cards / xrefs / copy-pairs, then
asserts:

| assertion | why it exists |
|---|---|
| every dotted anchor `golden/` published exists, **exactly once** | these are the inbound deep links; a slugified or missing id breaks them silently |
| no expected anchor is duplicated | a duplicate sends `getElementById` and every deep link to the wrong element |
| every `#nd-toc a[href^="#"]` resolves to exactly one element | catches TOC drift and anchor collisions |
| every page with entries renders kind badges | catches the `--py-*` tokens or the badge going missing |
| the index renders **at least** as many autosummary rows as Sphinx did | 47 vs 44 — the three rows Sphinx dropped |
| every source link starts `github.com/OpenProteinAI/openprotein-python/blob/<the pinned commit>/` | line numbers are only meaningful against one tree; a movable tag would silently re-point all ~500 of them. The SHA is read from `sdk-pin.json` so the assertion cannot drift from the generator |
| every `PyGroup` is `aria-expanded="true"` | groups are open by default |
| every `PyCard` is `aria-expanded="false"` and no `[role="region"]` is visible | classes are collapsed on arrival |
| every card has exactly `Copy code, Copy link`, and the source link comes after them | the ordering the header depends on |
| no `article` contains `code-block::`, `` ``python `` or `](/python-api` | unrendered RST or a literal markdown link |
| no card contains a `<blockquote>` | a `>>>` doctest read as markdown quoting |
| every cross-reference resolves to an anchor the site publishes | built from `golden/`, which is how `Protein.NullMSA` was caught |
| zero console errors | |

Note the card selector is `article h3:has(> button[aria-expanded])` — a plain markdown `###` also
lives in an `<h3>` and carries fumadocs' own "Copy Anchor Link" button, which produced a false
failure on the index page before it was scoped.

`index` is served at the **folder URL** (`/python-api/api-reference`), not `/index`; the script
special-cases it. Requesting `/index` returns 404 and every assertion then fails misleadingly.

## Expected output

```
  align          20 anchors    6 toc   20 badges   20 src   3 groups    3 cards   27 xrefs  3/3 copy pairs
  data           10 anchors    5 toc   10 badges   10 src   2 groups    3 cards   10 xrefs  3/3 copy pairs
  design         20 anchors    4 toc   20 badges   20 src   2 groups    2 cards   13 xrefs  2/2 copy pairs
  embedding     193 anchors   19 toc  193 badges  193 src   5 groups   14 cards  299 xrefs  14/14 copy pairs
  fold           85 anchors   16 toc   85 badges   84 src   3 groups   13 cards   89 xrefs  13/13 copy pairs
  index           0 anchors   17 toc    0 badges    0 src   0 groups    0 cards   45 xrefs  0/0 copy pairs  47/44 summary rows
  jobs           10 anchors    5 toc   10 badges   10 src   2 groups    3 cards    6 xrefs  3/3 copy pairs
  models         55 anchors   15 toc   55 badges   55 src   7 groups    7 cards   72 xrefs  7/7 copy pairs
  molecules      36 anchors   14 toc   36 badges   36 src   7 groups    7 cards   30 xrefs  7/7 copy pairs
  openprotein    15 anchors    3 toc   15 badges   15 src   1 groups    2 cards   14 xrefs  2/2 copy pairs
  predictor      20 anchors    2 toc   20 badges   20 src   0 groups    2 cards   23 xrefs  2/2 copy pairs
  prompt         37 anchors    8 toc   37 badges   37 src   2 groups    6 cards   56 xrefs  6/6 copy pairs

all checks passed — 501 dotted anchors present and unique, 652 cross-references resolve
```

Two numbers to explain before assuming a regression: `fold` shows **84** source links for 85
anchors, because the synthetic `model_config` on `ESMFold2Confidence` has no source; and
`predictor` shows **0 groups** because its `.rst` put both classes in a single unnamed section.

## Manual checks worth doing

- **Both themes.** The `--py-*` tokens and the injected-code-block surface are both redefined
  under `.dark`.
- **A deep link into a collapsed class**, e.g.
  `/python-api/api-reference/fold#openprotein.fold.FoldResultFuture` — the card must open and
  scroll.
- **The deepest docstring shapes.** `PoET2Model.embed` (parameters + returns, recovered by the
  parser fallback), `EmbeddingsAPI` (two `.. code-block::` blocks), `openprotein.connect` (a bare
  `>>>` doctest), `FoldResultFuture.wait` (inherited sections).
- **The copy buttons.** Grant clipboard permissions in Playwright and read the text back — the
  header lives inside the toggle, so this is the only way to check it.

## Extending the check script

Add to the single `page.evaluate` per page and assert on the returned object; keep the
browser-side code dependency-free. Write the failure message as *what broke*. **Before trusting a
new assertion, break the thing it guards and confirm it goes red** — the REST script shipped a
vacuous assertion that way, and this one's anchor-button check had to be moved after the expand
click for the same reason.
