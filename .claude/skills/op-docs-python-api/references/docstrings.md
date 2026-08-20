# Docstrings — parsing, RST translation, cross-links

Two separate concerns, in two places. **Sections** are parsed by griffe at generation time
(`members.py`). **Prose inside a section** is RST, normalised to markdown at render time
(`lib/python-doc.ts`). Cross-reference targets are resolved at generation time, because only the
generator knows which page documents what.

## Section parsing — `members.py:parsed_sections()`

`Parser.auto` infers a docstring style **per docstring** and gets it wrong. Measured:
`infer_docstring_style` classifies `openprotein.embeddings.PoET2Model.embed` as google-style, so
its NumPy `Parameters\n----------` block came back as a single prose blob:

```
auto     -> ['text']
numpy    -> ['text', 'parameters', 'returns']
google   -> ['text']
```

`parsed_sections()` therefore parses with `auto`, and **only if that finds no structure** tries
`numpy` then `google`, keeping the richest result. Preferring `auto` on a tie means the rest are
unaffected.

It also repairs one thing before parsing: a NumPy section underline typed with `_` instead of
`-`. napoleon accepted `Parameters\n__________`; griffe returns prose. Exactly one docstring in
the SDK has it (`predictor/predictor.py:289`) and it cost `PredictorAPI.ensemble` its entire
parameter table. `_repair_underline()` touches only an underline of 3+ characters directly below
a known NumPy header — and the typo is still filed in `UPSTREAM.md`, because repairing the render
is not the same as excusing it.

**Sections come from whichever object owns the docstring.** For an inherited member that is an
ancestor, not the override — the override has no docstring at all, so parsing it left `wait`,
`stream`, `get_item` and `get_metadata` with prose (from the MRO walk) but no parameter table.
`sdk.py:inherited_docstring_owner()` returns the ancestor, `select()` stashes it as
`extras["doc_owner"]`, and `describe()` parses sections from there.

Together these two recovered **34** docstrings that were rendering their parameter tables as
paragraphs — 13 from the parser fallback, 21 from the docstring owner — out of the **495** the
guard scans (every entry and member carrying a docstring, `summary_only` included).

> `pnpm sync:pyapi` warns when any docstring carries a section header but parsed to prose.
> Proven non-vacuous by disabling each fallback in turn and rerunning: auto-only reports 13,
> parsing the override instead of the docstring's owner reports 21, neither reports 34, both
> report 0.

The eight section kinds this SDK uses, out of the seventeen in griffe 2.2.0's
`DocstringSectionKind`. `SECTION_KINDS` in `members.py` is the allowlist; anything else is
dropped.

| kind | count | shape of `items` |
|---|---|---|
| `text` | 452 | — (`text` only) |
| `returns` | 192 | `{name, type, type_parts, text}` |
| `parameters` | 131 | `{name, type, type_parts, default, text}` |
| `raises` | 47 | same as parameters |
| `admonition` | 17 | — (`title` + `text`) |
| `examples` | 14 | **plain strings**, 16 of them — not objects |
| `attributes` | 8 | same as parameters |
| `other parameters` | 2 | same as parameters |

Two shape traps for anything walking `parsed`: an `examples` section's `items` are **strings**,
so `item.get('type_parts')` throws on it; and `type_parts` is `null` on 51 items whose type the
docstring did not give. `admonition` is the kind to remember — NumPy `Notes` / `Warning` blocks
become it.

## RST prose — `lib/python-doc.ts`

Docstring prose is RST, not markdown. Rather than add a second renderer it goes through
`lib/markdown.ts` after a normalising pass covering the four constructs this corpus uses.

The pass is **line-based and fence-aware**, and that matters more than it sounds: an earlier
version applied its inline rules globally and the double-backtick rule ate the ``` fences it had
just written, turning every example back into a paragraph. `DOUBLE_BACKTICK` is now guarded with
lookarounds so it cannot match a three-backtick run, and the inline pass skips fenced regions
entirely.

| construct | count | handling |
|---|---|---|
| `.. code-block:: python` / `ipython3` | 16 (4 / 12) | fenced; `ipython3`, `ipython`, `pycon` map to `python`, which shiki knows |
| bare `>>>` doctest blocks | 11 rendered strings on 9 objects | fenced as `python`, **prompts stripped** so the snippet is runnable. Markdown reads a leading `>` as quoting, so these rendered as nested quote bars |
| `:py:class:`X`` and friends | **60 in the corpus** — 46 resolve to links, 14 stay code spans | rewritten at *generation* time, so 0 reach the renderer; the rule here is defensive |
| `` ``x`` `` literals | — | code span |
| `.. note::` / `.. warning::` / … | — | bold lead-in |

Counts are reproducible: `.. code-block::` and `>>>` by grepping the emitted specs, roles by
counting `members.ROLE` matches during a `--check` run.

Both fencing passes **dedent by the block's own common indent**. A docstring's code is indented
relative to the docstring, and carrying that through left every example visibly inset inside its
block.

Parameter and return descriptions go through the same renderer. They used to be printed as plain
text with markdown stripped, which was fine until the generator started emitting links — then
`[Protein](/python-api/…)` showed up literally in `create_prompt`'s `context` parameter.

Anything not in that table arrives verbatim. A survey of the emitted specs found only
`code-block::` directives remaining before this pass was written; re-run that survey after an
SDK bump.

## Injected code blocks need their own surface — `app/global.css`

These are raw shiki fragments, not fumadocs `<CodeBlock>`s, so nothing styles them: shiki emits
`--shiki-light-bg` / `--shiki-dark-bg` and leaves it to the host to apply. Without a rule the
`<pre>` arrives **transparent with zero padding** and reads as body text.

`.prose-no-margin pre.shiki` supplies the surface from the site's own tokens
(`--color-fd-secondary`, `--color-fd-border`, radius `0.75em`) and takes only the *token colours*
from shiki. Two traps it encodes:

- The typography fork gives every `<code>` an inline-code box, which inside a `<pre>` paints a
  second box around the first. `pre.shiki code` resets border, background, padding and the
  `::before`/`::after` quotes.
- fumadocs' shiki CSS **already pads each `span.line` horizontally**, which is why its own code
  blocks put no inline padding on the `<pre>`. Adding some here doubled it, so the rule sets
  `padding-block` only.

**Notebook markdown cells share this path** (`lib/markdown.ts`, `.prose-no-margin`) and had both
defects. Changing these rules affects both renderers.

## Cross-references — resolved in `generate.py:build_resolver()`

Returns `(resolve, link)`.

`resolve(path)` maps a canonical **or** public dotted path to `{path, page}`. Two spellings have
to land on the same target: an annotation's `ExprName` reports the path the *annotating module
imported* (`openprotein.molecules.Complex`) while the same class read directly reports its
*defining* module (`openprotein.molecules.complex.Complex`). Both are registered.

A dotted **child** of a documented class is linked only if it is a genuinely documented member.
`Type[NullMSA]` resolves to `openprotein.molecules.protein.Protein.NullMSA` — a nested class
autodoc never emitted — and a link to it would land on an anchor that does not exist. `select()`
is run up front to build the per-class member sets this check needs.

`link(target, owner)` resolves a **docstring role** target, tried in order: as written; as a
member of the class the docstring belongs to (`get_as_complex` inside `Query`); as a sibling in
the same module; and finally as a unique bare last component anywhere. **Ambiguous last
components are dropped rather than guessed** — a wrong link is worse than a code span, and so is
an unresolvable one: `InvalidParameterError` is documented nowhere and stays plain, exactly as
Sphinx left it.

Three channels carry links into the output:

1. **Types** — `type_parts()` walks the griffe expression with `iterate(flat=True)` and reads
   `canonical_path` off each `ExprName`, so
   `Sequence[Complex | Protein | str | bytes] | MSAFuture` becomes three links and the
   punctuation between them. Runs of unlinked tokens are merged so the output is not one span
   per bracket. Emitted as `annotation_parts`, `returns_parts`, `bases_parts`, and `type_parts`
   on docstring section items. Measured **426 linked / 1032 plain** across all 65 entries
   (424/1032 over the 62 documented ones), split 167/257 across annotations and returns,
   243/731 across section item types, and 14/44 across bases. Bases link least because most name something this site does not document —
   `FoldModel` ×10, pydantic's `BaseModel` ×5, `ProteinModel` ×4, `BoltzModel` ×3, `_BasicSerde`
   ×3, plus `str`/`Enum`/`ABC`/`Generic`/`APISession` — and only 5 are subscripted generics
   arriving as one token. `UMAPModel(Future["UMAPModel"])` is the one visibly odd rendering:
   `Future` links and the quoted forward reference stays as the literal `['UMAPModel']`, which
   is what the source says.
2. **Prose** — `members.py:rewrite_roles()` turns RST roles into markdown links before the text
   is ever emitted.
3. **`inherited_from`** — griffe reports the defining module (`openprotein.jobs.futures.Future`),
   which is not the documented path (`openprotein.jobs.Future`), so `inherited_from_ref` carries
   the resolved one and that is what `py-class.tsx` links.

`check-pyapi.mjs` verifies **every rendered cross-reference** — 652 of them — against the 501
dotted anchors in `scripts/pyapi/golden/`, i.e. what the live Sphinx site published. Note that is
*not* the same as what this site publishes: 563 dotted ids are actually rendered, the extra 62
being members Sphinx did not emit. Checking against the stricter golden set is what caught the
`NullMSA` case; the cost is that a link to a legitimately new member would read as broken.

## Plain text still needs stripping

`lib/python-api.ts:plainText()` feeds the autosummary column, and only that — it is module-private,
reached solely through `firstSentence()` from `readPySummary()`. (`<meta name="description">`
comes from the MDX frontmatter via `page.data.description`, never through here.) Nothing is
linked in a table cell, so it strips markdown link syntax **and** leftover RST roles and
backticks. It gained the markdown-link rule only after the generator started emitting links and
`](/python-api` began appearing in the index table.
