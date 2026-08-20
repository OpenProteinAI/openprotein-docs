# Python API reference generator

Replaces `sphinx.ext.autodoc` + `sphinx.ext.viewcode` for the 11 pages under
`/python-api/api-reference/`. Static analysis only — the SDK is never imported.

| file | role |
|---|---|
| `requirements.txt` | exact pins; see the header for the venv recipe (**Python >= 3.10**) |
| `sdk.py` | griffe loading plus the five things griffe does not hand you directly |
| `members.py` | which members autodoc emitted, and what each one looks like |
| `generate.py` | the driver: `pnpm sync:pyapi` / `check:pyapi` / `diff:pyapi` |
| `seed_pages.py` | wrote `content/docs/python-api/api-reference/*.mdx` once from `pages.json`; refuses to overwrite without `--force` |
| `pages.json` | **the curation**: which classes appear on which page, in what order, under which heading, with which autodoc options. Lifted once from the old `.rst`, hand-maintained since |
| `extract_manifest.py` | how `pages.json` was produced. Provenance only — `__old/` goes away |
| `fetch_golden.py` | captures what the live Sphinx site rendered, into `golden/` |
| `golden/*.json` | **the oracle**: 61 classes / 439 members / 15 autosummary tables, as the old site actually rendered them. Committed because the live site is being replaced |
| `golden/html/*.html` | the fetched pages, so `--offline` stays reproducible |

## The numbers to hold onto

61 classes, 439 members, 512 dotted anchors across 11 pages, plus 44 rendered autosummary
rows on the index. Per page: `openprotein` 1/13, `molecules` 7/29, `data` 3/7, `jobs` 3/7,
`align` 3/17, `prompt` 6/31, `embedding` 14/179, `predictor` 2/18, `design` 2/18,
`fold` 13/72, `models` 7/48.

## Defects in the old site, found while capturing the oracle

- **Three `autosummary` entries never rendered** — `openprotein.svd.SVDAPI`,
  `openprotein.umap.UMAPAPI`, `openprotein.predictor.PredictionResultFuture`. All three
  resolve fine in SDK 0.16.1 (47 declared, 44 rendered), so the new index should show all 47.
- **`index.rst` puts the `molecules` table under "Property Regression Models"**, and leaves
  the preceding "Data Primitives" heading with no table at all.

## Fidelity

Two checks, at the two ends of the pipeline.

`pnpm check:pyapi:render` (`scripts/check-pyapi.mjs`) drives the rendered pages in Chrome and
asserts that **every dotted anchor the live Sphinx site published exists here, exactly once** —
those are the inbound deep links (`…/fold.html#openprotein.fold.FoldAPI.get_results`), and a
slugified or missing id breaks them silently:

```
all checks passed — 501 dotted anchors present and unique
```

501 = 61 classes + 439 members + `openprotein.connect`. It also checks TOC anchors resolve
1:1, that every entry carries a kind badge and a source link pinned to a `v*` tag, that the
index renders at least as many autosummary rows as Sphinx did (47 vs 44 — see below), and that
the console is clean.

`pnpm diff:pyapi` scores the generated member sets against `golden/`:

```
member sets: 61 exact / 61 classes   members 439 generated vs 439 rendered by Sphinx   kinds all match
```

That is exact parity with the live Sphinx site: every class, every member, every
method/property/attribute label. It was reached by iterating the selection rule against the
oracle, not by reading sphinx's source — the rule started at 32/61 and each clause below was
forced by a specific failure.

### The rule autodoc actually applies

1. Private (`_x`) and dunder members are always dropped. `:undoc-members:` does **not** rescue
   a private name — only `:private-members:` would, and nothing uses it.
2. `:exclude-members:` wins next.
3. `:members:` bare means **own members only**; inherited ones need `:inherited-members:`
   (whose bare form defaults to `'object'`, so in practice everything inherited qualifies).
4. A member must be **documented**, unless `:undoc-members:`. "Documented" includes a
   docstring inherited through the MRO — `autodoc_inherit_docstrings` defaults true, and 18
   members depend on it.
5. An explicit `:members: a, b, c` list **still** requires each name to be documented. This is
   why `openprotein.jobs.Future` lists `get` and the live page does not show it.
6. `:meta private:` anywhere in a docstring drops the member. 11 members carry it, which is
   what excludes `Future.create`, `MappedFuture.stream_parallel`/`stream_sync`,
   `PoETModel.attn` and `PredictorModel.InvalidMultitaskModelToCriterion`.
7. An unannotated `self.x = ...` instance attribute is invisible to autodoc — it collects
   `dir(cls)`, own `__annotations__` and the module analyzer's attribute comments, and such an
   attribute is in none of them. This is what drops `FoldAPI.session`.

### What griffe does not give you

- **`#:` attribute comments** — griffe 2.2.0 does not read them at all. Recovered from
  `lines_collection` by walking up from the attribute and stopping at the first non-`#:` line.
  20 comments in 2 files; these are the per-attribute descriptions on the FoldAPI and
  EmbeddingsAPI tables.
- **`openprotein/models/foundation/` is a PEP 420 namespace package** (no `__init__.py`).
  griffe will not walk into one, so `openprotein.models` has no `foundation` member and the
  six aliases through it raise `AliasResolutionError` — silently breaking five of the seven
  classes on the models page. Fixed by copying the tree and writing empty `__init__.py` files;
  the shims are reported on every run.
- **Assignment aliases** — `job_id = id`, `embeddings = embedding`, `predict = generate` bind
  another object. griffe reports a bare attribute whose `value` is an `ExprName`; resolving it
  against the class and its MRO recovers the docs, the type *and* the kind (`predict` is a
  method on the live page, an attribute statically).
- **pydantic** — v2 defines `__init__` on `BaseModel` and only stamps `__signature__` on the
  subclass, so there is no `__init__` statically and `force_inspection=True` is strictly worse
  (it returns pydantic machinery and loses the real fields). The signature is synthesised from
  the class's own annotation-only attributes, keyword-only; `model_config` is synthesised too,
  because Sphinx rendered it wherever `:exclude-members:` did not name it.
- **`Parser.auto`, never `Parser.google`.** This SDK is ~123 NumPy-style docstrings to ~20
  Google-style. Google-only parsing silently discards roughly 86 Parameters, 113 Returns and
  33 Raises sections — the whole reference would render as bare prose. `auto` is the griffe
  equivalent of the `sphinx.ext.napoleon` the old site ran.
- **napoleon rewrites a class docstring's `Attributes` section into `.. attribute::`
  directives.** That is why `FoldResultFuture.job` appears on the live page although autodoc
  emits only 36 members for it, and it is where every pydantic field's description comes from.

### One deliberate deviation

Member **order**. Sphinx's `bysource` sort keys on `tagorder.get(name, len(tagorder))` — the
dict's *size*, not max+1 — so inherited members tie with whichever own member sits at that
index and the two groups interleave. On `FoldResultFuture` that scatters 14 inherited members
into the middle of the own ones. We emit own members in source order, then inherited, then
docstring-only. `diff:pyapi` compares sets and kinds, and reports order separately.

### Source links

`ref` is `v<version>` from the installed distribution, and the wheel was verified
**byte-identical** to commit `85dc94bd15a33bdc8674ad899571043016427ce3` (tag `v0.16.1`) for
`fold/fold.py`, `jobs/futures.py` and `molecules/__init__.py` — so the line numbers mean
something. Paths come from `relative_package_filepath` (never `relative_filepath`, which
falls back to an absolute path when the file is outside cwd). Two caveats: a decorated
function's `lineno` is the **first decorator** line while a property's is the `def` line, and
griffe's dataclasses extension synthesises `__init__` with `lineno == 0` — guard before
linking.
