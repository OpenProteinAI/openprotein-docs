# The generator — `scripts/pyapi/`

Static analysis with griffe 2.2.0 against `openprotein-python` 0.16.1. The SDK is **never
imported**: `force_inspection=True` was tried and is strictly worse (see below).

```
pnpm sync:pyapi          # write specs/openprotein*.json
pnpm check:pyapi         # rebuild in memory, fail if specs/ has drifted
pnpm diff:pyapi          # score member sets and kinds against golden/
```

Needs **Python ≥ 3.10** (griffe's floor). `generate.py` exits early with the venv recipe if the
interpreter is older, which the machine default `python3` (3.9) is.

## Loading — `sdk.py:load_sdk()`

Returns `(package, tree, shimmed)`.

**`openprotein/models/foundation/` is a PEP 420 namespace package** — no `__init__.py`. griffe's
finder will not walk into one, so `openprotein.models` comes back without a `foundation` member
and the six aliases through it raise `AliasResolutionError` the moment anything touches
`.docstring` or `.filepath`. That silently broke **six of the seven classes on the models
page** — every one except `ModelsAPI`, which comes from `models/models.py`: `RFdiffusionModel`,
`RFdiffusionFuture`, `BoltzGenModel`, `BoltzGenFuture`, `ProteinMPNNModel`, `ESMIF1Model`. The fix copies the SDK to a shadow tree and writes empty `__init__.py` files; the shims
are returned and printed on every run, so a new one appearing is visible.

**`Parser.auto`, never `Parser.google`.** This SDK is ~123 NumPy-style docstrings to ~20
Google-style; google-only parsing silently discards roughly 86 Parameters, 113 Returns and 33
Raises sections. `auto` is the griffe equivalent of the `sphinx.ext.napoleon` the old site ran —
but it is still not sufficient on its own, see `docstrings.md`.

`resolve_aliases=True, resolve_external=False`: the SDK re-exports heavily
(`openprotein.fold.FoldAPI` is an alias for `openprotein.fold.fold.FoldAPI`) and we do not want
griffe chasing third-party packages.

## The member rule — `members.py:select()`

Derived by running candidate rules against `golden/` — the 439 members the live site actually
rendered — not by reading sphinx's source. It started at 32/61 exact and each clause below was
forced by a named failure.

| clause | forced by |
|---|---|
| Private (`_x`) and dunder members are always dropped. **`:undoc-members:` does not rescue a private name** — only `:private-members:` would, and nothing uses it | `FoldAPI._load_models`, `__init__` |
| `:exclude-members:` wins next | 12 directives use it: 5 hide pydantic's `model_config` (`AssayMetadata`, `Job`, `PromptMetadata`, `QueryMetadata`, `PromptJob`), 5 hide `create`/`get_model` on the embeddings models, plus `OpenProtein.request` and `DataAPI.load_assay`. `ESMFold2Confidence` notably does **not** — which is why `model_config` appears there |
| `:members:` bare means **own members only**; inherited need `:inherited-members:` (whose bare form defaults to `'object'`, so in practice everything inherited qualifies) | the 10 fold model classes showing exactly 1 member |
| A member must be **documented** unless `:undoc-members:` — *including* a docstring inherited through the MRO, since `autodoc_inherit_docstrings` defaults true | **25 members across 13 classes** depend on the MRO walk; neutralising `inherited_docstring` drops 439 → 414 |
| An explicit `:members: a, b, c` list **still** requires each name to be documented | `openprotein.jobs.Future` lists `get`, which has no docstring and is not rendered |
| `:meta private:` anywhere in a docstring drops the member | 11 carry it, but only **6** are load-bearing here — `Future.create`, `MappedFuture.stream_sync`/`stream_parallel`, `PagedFuture.stream_sync`/`stream_parallel`, `PoETModel.attn`. The other 5 (`DesignFuture.__init__`, `FoldResultFuture.__init__`, `PredictorModel.__init__`/`__eq__`, `PredictorModelGroup._get`) are already dropped by the private/dunder rule |
| An unannotated `self.x = …` instance attribute is invisible to autodoc — it collects `dir(cls)`, own `__annotations__` and the module analyzer's attribute comments, and such an attribute is in none of them | `FoldAPI.session` |

Two things are then **added**: `model_config` for pydantic classes whose directive did not
exclude it — five did, and `ESMFold2Confidence` forgot to, so Sphinx rendered it there — and
any attribute the class docstring's `Attributes` section documents but the class body does
not (see napoleon, below). Both are skipped when an explicit `:members:` list is given,
because such a list is exhaustive.

## The six things griffe does not hand you

**1. `#:` attribute comments.** griffe 2.2.0 does not read them at all — `attr.docstring` is
`None` for every class-level attribute of `FoldAPI`, including the 11 that carry one. They are
what the live page prints under each model attribute, so dropping them loses documentation on
two of the eleven pages. `hash_comment()` walks up from `lineno - 2` through
`package.lines_collection[filepath]` (already cached — `store_source` defaults true, so no extra
I/O) and **stops at the first non-`#:` line**. That stop is load-bearing:
`embeddings/embeddings.py` has an ordinary `# added for static typing` comment directly above a
block, and Sphinx does not absorb that one either. 20 comments in 2 files
(`fold/fold.py` 11, `embeddings/embeddings.py` 9), all recovered. `FoldAPI` renders 16
attributes, 11 with a description; the 5 aliases (`boltz_2`, `boltz_1x`, `boltz_1`,
`alphafold2`, `rosettafold_3`) correctly stay blank, exactly as the live page had them — which
is also why that directive needs `:undoc-members:`, or those five would not appear at all.

**2. Assignment aliases.** `job_id = id`, `embeddings = embedding`, `predict = generate` bind
another object; griffe reports a bare attribute whose `value` is an `ExprName`.
`alias_target()` resolves it against the class and its MRO, recovering the docs, the **type**
and the **kind** — `predict` is a *method* on the live page but an attribute statically.
Resolution runs for **every** attribute, not only undocumented ones: `predict` is documented by
its class docstring, so an `if not doc` guard skipped it and left the kind wrong.

A second subtlety, and the direction matters: **resolve from the class that owns the
assignment, not from `cls`.** `job_id = id` is written in `Future`'s body, so Python binds
`Future.id` there and for ever — and `EmbeddingsResultFuture` overrides `id` with an
*unannotated* property. Starting the walk at `cls` finds that override and loses the `str`,
which is exactly why the live page shows `property id` with no type but `property job_id: str`.
Sphinx is right on both; `alias_target()` now tries `target.parent` and its MRO first, then
`cls`. (`job_id` is emitted on 10 classes across 4 pages — embedding 6, models 2, fold 1,
prompt 1.)

**Assignment aliases outrank the MRO.** At runtime `predict` *is* `generate` — the assignment
binds the function object — so autodoc read `generate.__doc__`, and the live page showed
`predict` with the full "Run a protein structure generate job using RFdiffusion" prose and all
16 parameters. Deferring to the MRO instead picked up `ProteinModel.predict`'s one-line "Alias
for the design method" and dropped the parameter table on both `predict` members. Only the
alias's *own* docstring outranks the target, and a bare assignment cannot have one.

**3. MRO docstring inheritance.** `inherited_members` deliberately omits names the subclass
overrides, so it cannot answer this; `cls.mro()` can. It is C3-linearised, excludes the class
itself, silently drops unresolvable bases (`ABC`, `Generic`), and returns `[]` rather than
raising for pydantic classes. `inherited_docstring_owner()` returns the **ancestor object**, not
just its text, because the docstring's *sections* have to be parsed from whatever owns it — see
`docstrings.md`.

**4. pydantic.** v2 defines `__init__` on `BaseModel` and only stamps `__signature__` on the
subclass, so there is no `__init__` statically. `force_inspection=True` makes it **strictly
worse**: `ESMFold2Confidence` goes from 5 real fields to 22 members of pydantic machinery with
the fields gone, and it imports the package. `pydantic_signature()` synthesises the signature
from annotation-only attributes, keyword-only — reproducing the live
`(*, ptm, iptm, complex_plddt, chains_ptm, pair_chains_iptm)` exactly. Field *descriptions* come
from the class docstring's `Attributes` section, not from the attributes.

Four details it has to get right, each forced by a signature mismatch against `golden/`:

| detail | without it |
|---|---|
| Detect pydantic through the **MRO**, not `cls.bases` | `PromptJob(Job)` has no `BaseModel` base of its own, fell through to the `__init__` lookup and rendered `()` |
| Collect fields **base-first**, a re-declaration updating in place | `PromptJob` would list its own `job_type` first instead of in `Job`'s position |
| Unwrap `Field(…)`: a keyword-only call means **required**, a positional first argument or `default=` is the default | printed `id=Field(description='Prompt unique identifier.')` on the page |
| `model_config = ConfigDict(extra="allow")` anywhere up the chain appends `**extra_data` | `Job` and `PromptJob` dropped the trailing `**extra_data` Sphinx showed |

The synthetic `model_config` also carries `ClassVar[ConfigDict]` and the value `{}`, because it
is otherwise the only untyped attribute on its page.

**5. Signatures.** Three separate gaps, all found by scoring signatures against `golden/`
(see `oracle.md`) — 434 of 501 matched before, 484 after.

- **The class signature comes from the MRO.** `autoclass_content = "class"` picks the class
  docstring, but `autodoc_class_signature = "mixed"` still introspects the runtime class, so an
  inherited `__init__` supplies the parameters. `target.members.get("__init__")` is own-members
  only and left **11 classes rendering `()`** — `OpenProtein` among them, whose `__init__` lives
  on `openprotein.base.APISession`. `sdk.inherited_member()` walks `[cls, *cls.mro()]`.
- **Constant defaults fold.** griffe reports a default as written; Sphinx printed the runtime
  value. `sdk.constant_value()` follows the expression's `canonical_path` from the package root
  and substitutes a plain literal — `interval=config.POLLING_INTERVAL` → `interval=5`, 25
  signatures. **Module-level only**: an enum member resolves the same way, but Sphinx printed
  `reduction=ReductionType.MEAN`, not `'MEAN'`, so folding those made 11 signatures worse. The
  guard is `parent.kind == "module"`.
- **Annotations are absent from the signature on purpose.** `autodoc_typehints = "description"`
  moved them into the parameter table, which the golden signatures confirm
  (`fold(sequences, diffusion_samples=1, …)`, no types). Do not "restore" them.

**6. Overloads and properties.** `.overloads` is read off the **function**, not the parent — the
parent's `overloads` dict is emptied when the implementation is visited, and it is a
`defaultdict` that grows stray empty entries just from being read. 3 members carry overloads.
A property is `Kind.ATTRIBUTE` with `'property' in labels`; a plain attribute carries
`instance-attribute` / `class-attribute` instead. `kind_of()` encodes this.

**The alias trap.** Members reached through an `Alias` *are* `Alias` objects, so
`isinstance(m, Function)` is `False` and classification silently collapses. `openprotein.data.AssayDataset`
is an alias and so is every member read off it. `.kind` and `.labels` proxy through, but
anything reading `.parameters` or `.value` needs `deref()`.

## napoleon

napoleon rewrote a class docstring's `Attributes` section into `.. attribute::` directives.
That is why `FoldResultFuture.job` appears on the live page although autodoc emits only 36
members for it, and it is where every pydantic field's description comes from.
`docstring_attributes()` reproduces it; `py-class.tsx` skips the `attributes` section when
rendering because those entries are already members.

## Source links

**`ref` is the commit, never the tag.** `sdk.SDK_COMMIT` is
`85dc94bd15a33bdc8674ad899571043016427ce3`; the emitted `source` is
`{repository, ref: <commit>, tag: "v0.16.1"}` and every `[source]` URL resolves through the SHA.
A tag is movable and all ~500 line ranges are only meaningful against one exact tree — re-tagging
`v0.16.1` would silently point them all at different code.

The commit is **proven, not assumed**: the annotated tag `v0.16.1` is object `c1e67f31…`
pointing at it, and all **51** SDK files the specs line-link are byte-identical to it.
`sdk-pin.json` records the sha256 of each; `pnpm verify:pyapi:pin` re-checks them offline and
`--online` re-fetches every one from GitHub. Both directions are proven non-vacuous — tampering
with one installed file reports `sha256 … != pinned`. `check-pyapi.mjs` reads the SHA out of the
pin, so the rendered-link assertion cannot drift from the generator.

Paths come from **`relative_package_filepath`** — never `relative_filepath`, which falls back to
an absolute path when the file is outside `cwd`. Two caveats encoded in `_source()`: a decorated
function's `.lineno` is the **first decorator** line while a property's is the `def` line, and
griffe's dataclasses extension synthesises `__init__` with `lineno == 0`, so a falsy line means
no link. Exactly one member has no source link today: the synthetic `model_config`.

## Emitted shape

`specs/openprotein.<module>.json` — 16 files, 696 KiB.

```jsonc
{
  "module": "openprotein.fold",
  "entries": [{
    "name": "FoldAPI", "path": "openprotein.fold.FoldAPI", "kind": "class",
    "signature": "(session)", "bases": [], "bases_parts": [],
    "doc": "…", "parsed": [ … ], "module": "openprotein.fold.fold",
    "source": { "file": "openprotein/fold/fold.py", "line": 19, "end": 126 },
    "section": "Interface", "page": "fold",
    "members": [{
      "name": "boltz2", "kind": "attribute", "doc": "Boltz-2 model",
      "inherited_from": null, "inherited_from_ref": null,
      "annotation": "Boltz2Model", "annotation_parts": [{ "text": "Boltz2Model", "path": "…", "page": "fold" }],
      "value": null, "source": { … }, "parsed": []
    }]
  }],
  "sdk": { "package": "openprotein-python", "version": "0.16.1" },
  "source": { "repository": "https://github.com/OpenProteinAI/openprotein-python", "ref": "v0.16.1" },
  "generator": "scripts/pyapi + griffe 2.2.0"
}
```

Method members carry `signature`, `returns`, `returns_parts` and `overloads` instead of
`annotation`. `summary_only: true` marks the three objects only the autosummary index needs.
Measured across all 16: 439 members (235 method, 158 property, 46 attribute), 164 inherited, 3
with overloads, 1 synthetic, 1 without a source link.

## Adding or removing a documented class

1. Edit the section's `entries` in `scripts/pyapi/pages.json` — `{directive, target, options}`,
   where `options` mirrors the autodoc directive options.
2. `pnpm sync:pyapi`, restart `pnpm dev`.
3. Add or remove the `<PyClass path="…" />` line **and** the path in the enclosing
   `<PyGroup anchors={[…]}>`.
4. `pnpm check:pyapi && pnpm build && pnpm check:pyapi:render`.

`pnpm diff:pyapi` **says nothing at all** about a new class: `report()` does
`reference = by_path.get(entry["path"]); if reference is None: continue`, so a class `golden/`
does not contain is neither scored nor mentioned, and the `61 exact / 61 classes` line does not
move. Verify a new class by hand. Do not "fix" the oracle either — it is a record of what Sphinx
published.

## Do not

- Hand-edit `specs/*.json`. `check:pyapi` compares bytes and the next sync reverts it.
- Import the SDK, or reach for `force_inspection=True`.
- Re-run `extract_manifest.py` expecting to keep hand edits to `pages.json` — it overwrites.
  It exists for provenance; `__old/` is deleted in Phase 10.
- Re-run `seed_pages.py` without understanding `--force`: it refuses to overwrite by default,
  and with `--force` it discards hand edits to all 12 `.mdx` files.
