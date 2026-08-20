# Authoring a reference page

## Frontmatter contract

```yaml
---
title: "openprotein.fold"       # required; the h1 and the sidebar label
description: "Create PDBs …"    # optional in the schema, set on all 12. Plain text only
pythonApi: true                 # the flag that turns on the TOC merge
---
```

`description` is **not** enforced: `docsPageSchema` is `pageSchema.extend({…})` and never
redefines it, and `pageSchema` types it optional. Every page sets one anyway, because it is the
only text `<meta>`, the prev/next footer cards and search have to work with.

`docsPageSchema` in `lib/source.tsx`. **`pythonApi` is a boolean**, not a module name: the
classes a page renders are declared inline with `<PyClass>`, and a page can draw on five modules
(`embedding.mdx` pulls from `openprotein.embeddings`, `.svd`, `.umap`, `.common` and
`.embeddings.future`). Typing it as a string would repeat the `openapi:` trap on the REST pages,
where the value is decorative and misleads.

The flag drives exactly two things, both in `app/(docs)/[...slug]/page.tsx`: it swaps the TOC
for `pyToc(page.path, toc)`, and it suppresses the visible `<DocsDescription>` subtitle — see
below.

## The description is metadata, and the body keeps its intro

These pages open with their own intro paragraph, which carries cross-links the description
cannot. Both would print the same sentence twice, so the **route suppresses the visible
subtitle** when `pythonApi` is set. The description still feeds `<meta name="description">`
(verified present), the prev/next footer cards and search — but **not the sidebar**: the
notebook layout's page-tree items render the title only, and the two `description` reads in
`notebook/slots/sidebar.js` belong to the layout-tab picker, which this site does not
configure.

This replaced an earlier rule that de-duplicated the body against the description, and which
silently discarded the **whole** opening paragraph whenever the intro was a single sentence —
taking `[align](./align)` off the fold page and both PoET links off prompt. Keep the paragraph.

Descriptions must be **plain text**: no markdown links, no backticks. `seed_pages.py:sentence()`
strips both.

## Page structure

```mdx
Intro paragraph, with links.

<PyGroup id="interface" title="Interface"
  anchors={[
    "openprotein.fold.FoldAPI",
  ]}
>

<PyClass path="openprotein.fold.FoldAPI" />

</PyGroup>
```

- `<PyGroup>` renders the section heading itself, so there is **no** `##` above it. Its `id` must
  be the rehype-slug of `title` or `#models` stops resolving.
- `anchors` lists the class paths inside. Members are matched by dotted prefix, so they are not
  enumerated.
- A section that carries only prose or an `<PySummary>` table keeps an ordinary `##` heading —
  that is why the index page has real markdown headings and the other 11 do not.
- Blank lines inside the `<PyGroup>` block are required for MDX to read the prose as markdown.

`content/docs/python-api/api-reference/meta.json` lists the 11 module pages and **not**
`index` — fumadocs links a folder to its index page, so listing it as a child rendered
"API reference" twice in the sidebar and twice in the breadcrumb.

`content/docs/python-api/meta.json` holds the section, and `content/docs/meta.json` places
`python-api` between `walkthroughs` and `rest-api`, following the old root toctree.

## Heading text and anchors are an API

Element ids are the dotted paths, so member and class anchors are safe from editorial changes.
What is *not* safe is the group headings, whose ids come from their text. The old site's section
anchors that must survive:

| page | anchors |
|---|---|
| `fold` | `#interface`, `#models`, `#results` |
| `models` | `#interface`, `#models`, `#rfdiffusion`, `#results`, `#boltzgen`, `#results-1`, `#proteinmpnn`, `#esm-if1` |
| `openprotein` | `#session` |
| `index` | **17** section headings — the 15 that carry a `<PySummary>`, plus prose-only `#data-primitives` and `#transform` |

`models`' `#models` is an ordinary `##` heading, not a `<PyGroup>`: the old page wrapped
RFdiffusion / BoltzGen / ProteinMPNN / ESM-IF1 in an h2 "Models", and dropping it silently
retired that anchor. It was missing until a re-audit against `golden/html/models.html` caught it.

**Two anchors change in this migration, both off Sphinx's numeric fallback**, which nobody links
on purpose: `models#id1` → `#results-1` (the duplicate "Results"), and `index#id1` → `#models-1`
(the duplicate "Models" — `### Models` under Foundation models takes `#models`, the `## Models`
module section is the second). `slugify()` shares its `seen` counter across the whole page, so
any future duplicate heading text will do the same.

The only other old ids the new pages do not publish are the 11 `openprotein-<page>` h1 section
slugs (`#openprotein-fold`, …). Those pointed at the top of their own page, which is exactly
where an unresolvable fragment leaves the browser, so nothing is lost. Verified by diffing
`<section id>` sets: after the `#models` fix, `id1` and `openprotein-<page>` are the complete
difference.

## Adding a page

1. Add the page to `pages.json` (`page`, `title`, `sections`).
2. `pnpm sync:pyapi` — the generator emits a `page` field on each entry, which is what makes
   cross-page links resolve.
3. Write `content/docs/python-api/api-reference/<page>.mdx`, or run
   `python3 scripts/pyapi/seed_pages.py --only <page>`.
4. Add `<page>` to `api-reference/meta.json`.
5. Add its golden fixture only if the old site had that page — otherwise `diff:pyapi` correctly
   reports its classes as absent from the oracle.
6. `pnpm build && pnpm check:pyapi:render`.

## Regenerating the seeded pages

`seed_pages.py` refuses to overwrite by default. `--force` discards hand edits to **all 12**
files; `--only <page> --force` limits the damage. It also rewrites `api-reference/meta.json`
every run.

## What the reader sees

Every page renders in full to an anonymous visitor: prose, groups, collapsed class cards, and
every member once a card is opened. No page is gated and none is dynamic — all 12 prerender.
