<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working in this repo

`README.md` covers install, layout, adding pages and the check commands. Read that first.

## Non-negotiables

- **Heading text is an API.** Anchors derive from it and `proxy.ts` + `check:urls` depend on 112
  old URLs and their fragments still resolving. Change wording only as a deliberate, separate pass.
- **Element ids on Python API pages are the dotted paths, unslugified.** Never slugify them.
- **`specs/` is generated and committed.** Never hand-edit; `pnpm check:pyapi` and
  `pnpm check:specs` compare against a regeneration. After `pnpm sync:pyapi`, restart `pnpm dev`
  — nothing watches `specs/`.
- **Notebook wrapper filenames are the notebook's stem**, because that was the old URL.
- The build must be **warning-free**. The Sphinx site ran `sphinx-build -W`; hold the same bar.

## Conventions

- Comments are one or two lines. Long rationale belongs in `.claude/skills/`, not in source.
- Default font size in components; reach for `text-sm` only with a reason.
- Content images carry no border or background.
- Two skills hold the deep detail: `.claude/skills/op-docs-rest-api` and
  `.claude/skills/op-docs-python-api`. Load the relevant one before touching those subsystems.

## Before saying it works

Run the checks in `README.md`. `pnpm build` alone does not catch a component that throws at
request time, a broken image, or RST that survived conversion — `pnpm check:content` does, and it
needs a running server.
