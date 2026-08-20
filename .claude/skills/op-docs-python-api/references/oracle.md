# The oracle — `scripts/pyapi/golden/` and `pages.json`

Two committed artifacts stand in for the old Sphinx site after it is switched off. Both were
captured once and are hand-maintained from then on.

## `golden/` — what the live site rendered

`fetch_golden.py` fetches the 12 pages from `https://docs.openprotein.ai/python-api/api-reference/`
and extracts, per page: the title, the ordered section headings, every autodoc entry with its
kind / dotted id / rendered signature / viewcode link, the `autosummary` tables, and a raw
`id="openprotein…"` count. It caches the HTML under `golden/html/` so `--offline` keeps working
after the live site is replaced. **Stdlib only** — no environment to set up.

```
python3 scripts/pyapi/fetch_golden.py            # fetch, cache, write golden/
python3 scripts/pyapi/fetch_golden.py --offline  # re-derive from the cache
```

Parsing is structural, not name-based: Sphinx nests member `<dl>`s inside their class's `<dd>`,
so a stack of open `dl.py-*` kinds recovers each entry's parent. Dotted-name parenting would
happen to work on these 12 pages — autodoc stamps the *documenting* class's path onto every
member, so all 439 ids are exactly `<class path>.<name>` — but the stack is correct by
construction rather than by luck, and does not depend on that stamping.

| page | classes | members | dotted anchors |
|---|---|---|---|
| `index` | 0 | 0 | 0 (44 autosummary rows in 15 tables) |
| `openprotein` | 1 | 13 | 16 |
| `molecules` | 7 | 29 | 37 |
| `data` | 3 | 7 | 11 |
| `jobs` | 3 | 7 | 11 |
| `align` | 3 | 17 | 21 |
| `prompt` | 6 | 31 | 38 |
| `embedding` | 14 | 179 | 194 |
| `predictor` | 2 | 18 | 21 |
| `design` | 2 | 18 | 21 |
| `fold` | 13 | 72 | 86 |
| `models` | 7 | 48 | 56 |
| **total** | **61** | **439** | **512** |

`anchor_count` is `re.findall(r'id="(openprotein[^"]*)"', html)`, so it counts only ids that
*begin* `openprotein` — section slugs like `interface` or `results` are never in it. The 512 is
therefore the **501** autodoc entries (61 classes + 439 members + `openprotein.connect`) plus
one h1 page-title slug per module page (`openprotein-fold`, `openprotein-models`, … 11 in all;
`index`'s h1 is `api-reference`, which does not match and is not counted).

`embedding` carries 14 classes because `SVDModel`, `UMAPModel` and `ReductionType` live in
`openprotein.svd`, `openprotein.umap` and `openprotein.common` — modules with no page of their
own.

## `pages.json` — the curation

Which classes appear on which page, in what order, under which section heading, with which
autodoc options, plus the section prose. None of it is derivable from the SDK, and
`__old/source/python-api/api-reference/` is deleted in Phase 10 — so it was extracted once by
`extract_manifest.py` and is hand-maintained now.

```jsonc
{ "source": "__old/source/python-api/api-reference",
  "pages": [{ "page": "fold", "title": "openprotein.fold",
    "sections": [
      { "heading": null, "level": 0, "prose": "Create PDBs …", "entries": [], "autosummary": [] },
      { "heading": "Interface", "level": 2, "prose": null,
        "entries": [{ "directive": "autoclass", "target": "openprotein.fold.FoldAPI",
                      "options": { "members": true, "undoc-members": true } }],
        "autosummary": [] }]}]}
```

`options.members` is `true` for a bare `:members:` and a **list** for an explicit
`:members: a, b, c`. `62` directives in total: 61 `autoclass` + 1 `autofunction`
(`openprotein.connect`).

`extract_manifest.py` also translates the RST cross-reference forms the prose uses. **Four
occur and only three are translated**: `:doc:`, `:py:*:` roles, and the embedded-target
hyperlink `` `Text <target>`_ `` — the last being the one that shipped `embedding.rst` into a
rendered page description before it was handled. A `.rst#anchor` target becomes `./page#anchor`;
a `.ipynb` target is resolved against the `notebook:` frontmatter of pages that exist, and left
as plain text with a WARN when none does.

The untranslated fourth is **`:ref:`**, used once (`embedding.rst:42`). `pages.json:661` still
carries the raw `:ref:`transform-models`. .. _transform-models:` and `embedding.mdx` was fixed
by hand to `[Transform Models](#transform-models)` — so `seed_pages.py --force` would
reintroduce the raw RST. Add a `:ref:` rule before re-lifting, or re-fix that line.

> Matching a notebook by searching the whole MDX body is wrong — it matched the previously
> seeded page that still quoted the filename in its own description. Match the `notebook:`
> field.

## Fidelity — `pnpm diff:pyapi`

Compares generated member **sets** and **kinds** against `golden/`, per class:

```
member sets: 61 exact / 61 classes   members 439 generated vs 439 rendered by Sphinx   kinds all match
```

The rule reached this by iteration: **32 → 36 → 49 → 59 → 61** exact, each step forced by a
named failure (see `generator.md`).

**Order is not compared at all** — `report()` diffs member name sets and kinds, nothing else,
and no order line is printed. The emitted order (own-by-source, then inherited, then
docstring-only) in practice matches Sphinx everywhere except `openprotein.fold.FoldResultFuture`,
where autodoc's `tagorder.get(name, len(tagorder))` tie scatters the inherited members into the
middle instead of grouping them at the end. Adding an order assertion would mean encoding that
tie, which is why it was left out.

A class not present in `golden/` is skipped, so adding a class the old site never documented
does not break the score.

## Defects in the old site, found while capturing the oracle

- **Three `autosummary` entries never rendered** — `openprotein.svd.SVDAPI`,
  `openprotein.umap.UMAPAPI`, `openprotein.predictor.PredictionResultFuture`. All three resolve
  fine in SDK 0.16.1: 47 declared in the `.rst`, 44 rendered. The new index shows all 47, with
  those three unlinked because no `autoclass` documents them.
- **`index.rst` puts the `molecules` table under "Property Regression Models"** and leaves the
  preceding "Data Primitives" heading with no table at all.
- **`models.rst` has two sections called "Results"**; Sphinx numbered the second `#id1`.
- **`openprotein.rst` cross-links `openprotein.Protein` and `openprotein.Model`**, neither of
  which is documented anywhere. Not dead *links*: Sphinx dropped the reference and printed both
  as bare `<code class="xref py py-class">` with no `<a>` (verified in
  `golden/html/openprotein.html`, where the `OpenProtein` xref on the same line *is* wrapped in
  an `<a>`). Rendering them as plain code spans is therefore parity, not a gap.
- **Ten griffe warnings at eight SDK sites** on every `sync:pyapi`. Eight are a parameter
  documented that does not appear in the signature — `align/align.py:391` and `:407` (`job`),
  `embeddings/embeddings.py:131` (`model_id`), `fold/future.py:294` (`sequence`),
  `models/foundation/rfdiffusion.py:209` and `boltzgen.py:224` (`n`),
  `models/foundation/esmif1.py:136` (`**kwargs`), `svd/models.py:169` (`reduction`) — and two
  are an untyped parameter, at the last two of those sites. These are upstream bugs; report
  them rather than reproducing them.
