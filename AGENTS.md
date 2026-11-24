<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Working in this repo

`README.md` covers install, layout, adding pages and the check commands. Read that first.

## Non-negotiables

- **Heading text is an API.** Anchors derive from it, and the in-page TOC and every deep link
  on the site follow. Change wording as a deliberate pass, not as a drive-by. `proxy.server.ts` still
  301s the old Sphinx `.html` URLs to their new homes, but only at page level — fragments from
  the old site are no longer asserted anywhere.
- **Element ids on Python API pages are the dotted paths, unslugified.** Never slugify them.
- **`specs/` is generated and committed.** Never hand-edit; `pnpm update:pyapi --check` and
  `pnpm update:restapi --check` compare against a regeneration. After either update, restart
  `pnpm dev` — nothing watches `specs/`.
- **Notebook wrapper filenames are the notebook's stem**, because that was the old URL. A
  `duoContent` page, a notebook paired with its App version, is named for its topic instead.
- The build must be **warning-free**. The Sphinx site ran `sphinx-build -W`; hold the same bar.

## Conventions

- Comment only code that is hard to understand. One short, direct line at most; never
  multi-line. Long rationale belongs in `.claude/skills/`, not in source.
- Font sizes come from the type scale in `TYPOGRAPHY.md`: named steps only (`text-sm`,
  `var(--text-sm)`). No `px` anywhere but hairlines: sizes are `rem` or `em`, so they follow
  the reader's text size. Centre text with layout, never a nudge.
- Content images carry no border or background.
- Five skills hold the deep detail: `.claude/skills/op-docs-rest-api`,
  `.claude/skills/op-docs-python-api`, `.claude/skills/op-docs-styling`,
  `.claude/skills/op-docs-editor` and `.claude/skills/op-docs-tutorial-screenshots`. Load the
  relevant one before touching those subsystems — styling covers `app/global.css` and the
  components, the editor skill covers `/editor`, and the screenshots skill covers retaking app
  screenshots in tutorials and how-tos.

## Before saying it works

Run the checks in `README.md`. CI only typechecks, builds and runs `check:links`, and a build
does not catch a component that throws at request time, a broken image or a console error. Run
`check:restapi` and `check:pyapi` yourself after touching either reference subsystem; for every
other page, open it in a browser and look.
