# OpenProtein.AI documentation

The docs site at `docs.openprotein.ai` – Next.js 16 + Fumadocs 16. Every page is public and built ahead of time; only the notebook routes under `/api/` need a running server.

## Setup

```bash
pnpm install
cp .env.example .env.local
pnpm dev                     # http://localhost:5002
```

Variables for `.env.local`:

| variable | needed for |
|---|---|
| `NEXT_PUBLIC_OP_SITE_URL` | canonical URLs. `http://localhost:5002` locally |
| `NEXT_PUBLIC_OP_APP_URL` | the web app: the header link and sign-in |
| `NEXT_PUBLIC_OP_API_URL` | the platform API for the models catalogue, sign-in and the playground. Sign-in and the playground exist only when this and `NEXT_PUBLIC_OP_APP_URL` are set, and work only on a `*.openprotein.ai` origin or behind `OP_SERVER_PROXY` |
| `OP_SERVER_PROXY` | the platform API: `pnpm dev` proxies `/api/v1/*` to it for local sign-in, `pnpm update:restapi` fetches the live REST specs from it and `pnpm update:pyapi:models` its models listing |
| `OP_SDK_GIT_URL` | the unpublished SDK repository `pnpm update:pyapi` installs from, until 0.18 ships |
| `NEXT_PUBLIC_OP_REPO_BRANCH` | the branch GitHub links ("Open in GitHub", notebook badges) point at. Use `main` |
| `NEXT_PUBLIC_OP_GA_ID` | Google Analytics |

### Signing in locally

Local docs signs in from the web app through the platform's handoff:

```bash
OP_SERVER_PROXY=<platform API origin>
NEXT_PUBLIC_OP_SITE_URL=http://localhost:5002
NEXT_PUBLIC_OP_API_URL=http://localhost:5002
NEXT_PUBLIC_OP_APP_URL=<web app origin>
```

- `pnpm dev` proxies `/api/v1/*` to `OP_SERVER_PROXY`, so the session's cookies land on `localhost`
- Login goes through the web app and comes back to `/auth/callback`. The local session is separate from your web app one
- Sign out ends the local session, then the web app offers to sign out there too
- Cookies on `localhost` are shared across ports, so a local web app on `localhost:5001` holds the same session cookie. Signing in to one signs the other out
- Chrome and Firefox only: Safari keeps no `Secure` cookies over `http://localhost`

Check your work before opening a PR:

```bash
pnpm types:check             # next typegen && tsc --noEmit
pnpm build                   # CI fails this if the build logs a single warning
pnpm check:mdx               # every page compiles as MDX
pnpm check:links             # images and internal links point at something real
```

Commands to verify the content of REST API, Python API and markdown links

```bash
pnpm check:pyapi:unit        # generator and browser-contract unit tests; needs the pinned Python environment
pnpm check:pyapi             # opens the Python API pages in Chrome
pnpm check:restapi           # opens the REST API pages in Chrome
pnpm check:live-openapi      # validates runtime document selection and server pinning
pnpm check:live-openapi:browser # live loading and fallback (authenticated dev server on :5002)
pnpm check:auth             # sign-in in Chrome against ./out, platform faked (see the script's header)
pnpm check:proxy            # pnpm dev's /api/v1 proxy against a fake upstream
node scripts/check-models.mjs # drives /models in Chrome: search, sort, filters, sidebar
node scripts/check-model-page.mjs # the base model pages: versions, endpoints (OP_TOKEN=… to send one)
pnpm check:github            # GitHub and notebook links resolve (needs network)
```

**For CI: only `types:check`, `build` and `check:links`.**

## Pages preview

Pushing to `develop`, or to a PR into it, publishes a static export to GitHub Pages via
`.github/workflows/pages.yml`. The site shows whichever ran
last, so a PR's preview stays up until the next push to `develop` or another PR. The site is
private: viewers sign in to GitHub with read access to this repo. It builds against the repository
variables `OP_APP_URL` and `OP_API_URL`: a reader signed in to that web app is signed in here too,
and the playground runs against that API. `proxy.server.ts`'s redirects and the notebook routes need a server, so they don't
exist there. `scripts/csp-static.mjs` adds a CSP to every exported page.

Files named `*.server.ts` read `cookies()` or `Request`; `*.static.ts` is the export-only
counterpart. `next.config.mjs` registers one set or the other, so each build sees only its own.
To reproduce the Pages build locally:

```bash
BUILD_TARGET=static NEXT_PUBLIC_BUILD_TARGET=static \
NEXT_PUBLIC_OP_SITE_URL=<preview origin> \
NEXT_PUBLIC_OP_APP_URL=<web app origin> \
NEXT_PUBLIC_OP_API_URL=<platform API origin> \
pnpm build                   # writes ./out
```

## Layout

| path | what |
|---|---|
| `content/docs/**.mdx` | the pages you write by hand, plus a `meta.json` per folder for sidebar order |
| `content/notebooks/**.ipynb` | 8 notebooks, each shown by a small wrapper page |
| `specs/*.openapi.json` | 9 REST specs – generated, committed |
| `specs/openprotein.*.json` | 25 Python API files – generated, committed |
| `public/_static/**` | images |
| `lib/`, `components/` | the renderers: MDX, notebook, REST, Python API, auth |
| `proxy.server.ts` | 301 redirects for the old site's `.html` URLs and the pre-restructure paths; under `pnpm dev`, the `/api/v1` proxy |
| `app/(models)/`, `components/models/` | `/models`, the system-model catalogue, `/models/<model>`, a page per base model on its default version, and `/models/<model>/<version>`, one per other version, each with its REST endpoints and in the search index: read from `NEXT_PUBLIC_OP_API_URL`'s `/models` (none when unset) at build, then hourly on the server. The only pages whose build needs the network; offline they say the catalogue couldn't load. Family names and order are the API's `/models/families`. Each version's BibTeX is its DOI's, fetched from doi.org in the browser when the version is picked |

## Adding content

| category | folder | takes |
|---|---|---|
| Overview | `content/docs/overview/` | MDX |
| Quickstart | `content/docs/quickstart/` | MDX |
| Concepts | `content/docs/concepts/` | MDX |
| Tutorials | `content/docs/tutorials/` | MDX, notebooks |
| How-to | `content/docs/how-tos/` | MDX |
| Reference | `content/docs/references/` | MDX (demo datasets, FAQ, publications) |
| REST API | `content/docs/references/rest-api/` | MDX + an OpenAPI spec |
| Python API | `content/docs/references/python-api/` | generated API reference |

**When adding a new page:**
- **List it in `meta.json`.** Add the filename (no extension) to that folder's `pages` array. The sidebar is a hand-written list, not alphabetical, so a file you forget still has a working URL but nothing links to it.
- **Tutorials: folders mirror the [landing page](content/docs/tutorials/index.mdx).** Put the page in the folder for its group, link it from the landing page, and list it in that folder's `meta.json`. The landing page's three groups (Prepare & Generate, Model & Predict, Analyze & Select) are separators in `tutorials/meta.json`, not folders. Give the page `sidebarTitle:` in its frontmatter when the landing page's link text differs from its title.
- **Don't reword a published heading.** Each heading's `#anchor` is generated from its text, so rewording breaks every link that points into the page.

<details>
<summary><b>1. A normal markdown page – any category</b></summary>

- Create `content/docs/<category>/<name>.mdx`:
  ```mdx
  ---
  title: Short page title
  description: One sentence. Used by search and the social preview image. May contain [links](/tutorials).
  ---

  ## First section
  ```
- Add `<name>` to `content/docs/<category>/meta.json`. That's it – it shows up in `pnpm dev`.

</details>

<details>
<summary><b>2. A notebook – Tutorials</b></summary>

```bash
cp my-notebook.ipynb content/notebooks/tutorials/design/generate/
node scripts/seed-notebooks.mjs        # writes the wrapper page for it
```

- The wrapper is an `.mdx` at the matching path under `content/docs/`, holding a `notebook:` line that points back at the `.ipynb`.
- Its title and description come from the notebook's first markdown heading and the text under it.
- **Don't rename the notebook** – the filename becomes the URL, underscores and capitals included.
- A tutorial with an App version too is one `duoContent` page instead; see [MARKDOWN.md](MARKDOWN.md).
- Link it from the tutorials landing page and list it in its sidebar group's `meta.json`, as above.

</details>

<details>
<summary><b>3. A REST API page</b></summary>

- You write the intro text in the `.mdx`.
- The endpoint list below it is generated from the service's OpenAPI spec – don't write or edit that by hand.
- **To change the text:** edit `content/docs/references/rest-api/<slug>.mdx` and leave the `openapi:` line alone.
- Prompt and Models fetch current OpenAPI in the browser, with the committed document as the offline/error fallback. Models selects only `/api/v1/models` routes from main's `/openapi.json`.
- The endpoint TOC and model-page playground schemas still come from committed specs.

**Adding a new service:**

1. Add a row to `SPECS` in `scripts/update-restapi.mjs` – this says where to fetch the spec from.
2. Add a matching row to `REST_API_PAGES` in `lib/openapi.ts` – `{ slug, id, title }`.
3. Create `content/docs/references/rest-api/<slug>.mdx` with `openapi: <id>` in the frontmatter.
4. Add `<slug>` to `content/docs/references/rest-api/meta.json`.
5. Run `pnpm update:restapi`, then **restart `pnpm dev`**.

The `id` in steps 1 and 2 and the `specs/<id>.openapi.json` filename must all match.

</details>

<details>
<summary><b>4. A Python API reference page</b></summary>

- All pages under `reference/python-api/` are **generated from the SDK** – anything you type into the body gets overwritten.
- What they contain is decided by `scripts/pyapi/pages.json`: which classes appear, under which heading, in what order.
- To document a new class, add it to that page's `sections[].entries` in `pages.json`, then run `pnpm update:pyapi` (below).

</details>

## Writing a page

Pages are **MDX**: normal markdown plus a set of components. **[MARKDOWN.md](MARKDOWN.md) is
the full guide** – frontmatter, code blocks, and every component with a screenshot of how it
renders.

The short version: headings, **bold**, lists, tables, links and ``` code fences behave the way
they do on GitHub. Images go in `public/_static/<section>/` and are linked as `/_static/...`.
Run `pnpm check:mdx` before you commit – it checks all pages in about a second.

## Typography

**[TYPOGRAPHY.md](TYPOGRAPHY.md)** is the type scale every font size on the site comes from,
which step each role takes, and why Object Sans needs no vertical nudging. Use its steps
(`text-sm`, `var(--text-sm)`), and `rem` or `em` for every other size: no `px` but hairlines.

## Generating content

Both reference sections are built from files committed to this repo, so a normal build needs neither the network nor Python.

> [!TIP]
> ### Use AI skills!
> `.claude/skills/op-docs-rest-api`, `.claude/skills/op-docs-python-api`,
> `.claude/skills/op-docs-styling` and `.claude/skills/op-docs-editor`.


### Manual generate content for:
<details>
<summary><b>REST API – <code>specs/*.openapi.json</code></b></summary>

```bash
pnpm update:restapi              # rebuild all 9 specs and write them
pnpm update:restapi --check      # rebuild in memory and fail if specs/ is out of date
pnpm update:restapi --only=fold,design
```

- Needs the network: five specs are fetched from `OP_SERVER_PROXY`, and four are copies kept on a bot-updated branch of the repo.
- **Restart `pnpm dev` afterwards** – nothing watches `specs/`.
- Don't edit a spec by hand; `--check` compares it byte for byte and the next run overwrites it.

</details>

<details>
<summary><b>Python API – <code>specs/openprotein.*.json</code></b></summary>

The site builds from committed specs without Python, SDK access or private credentials.
To regenerate, create a **new**, independent Python 3.13 environment. Stop if the path
already exists, including as a symlink; never reuse or replace an existing environment:

```bash
set -eu
if [ -e .venv-pyapi ] || [ -L .venv-pyapi ]; then
  echo 'Refusing to replace .venv-pyapi' >&2; exit 1
fi
python3.13 -m venv .venv-pyapi
export OP_SDK_GIT_URL=<SDK repository URL>   # until 0.18 is published
.venv-pyapi/bin/pip install -r scripts/pyapi/requirements.txt
pnpm update:pyapi                # regenerate everything, then verify it
pnpm update:pyapi --check        # verify only, write nothing
```

The temporary pin is branch `release/v0.18.0` at commit `c410c2fe442a7949c0545614c070026031f4cb59`,
not a released 0.18.0 wheel. Until it is published, pip installs it from `OP_SDK_GIT_URL`, which
needs Git access; put it in `.env.local` too, for `pnpm update:pyapi`. `[source]` links point at the
public `openprotein-python` repository and resolve once the commit is published there. This install reports `0.17.1.dev284+gc410c2fe4`; Git-derived package
versions can change when remote tags change, while the pinned code stays fixed. The generator
checks the installed PEP 610 Git identity and runs offline by default. To recheck source hashes
against GitHub, run `.venv-pyapi/bin/python scripts/pyapi/generate.py --verify-pin --online`
with `gh` authenticated. After SDK publication, switch to the actual public release and regenerate
with `pnpm update:pyapi <released-version>`; this explicitly rebuilds the generator environment.

One command does all of it:

- regenerate `specs/`
- re-record which SDK commit the `[source]` links point at
- rebuild the base-model sections of `pages.json` from the committed Models catalogue snapshot
- rewrite the 13 page bodies from `pages.json`
- refresh the report of SDK docstring bugs
- compare the result against the recorded baseline

**Restart `pnpm dev` afterwards.**

### Refreshing the Models catalogue

The base-model sections of `openprotein.models` come from the Models API, not from hand edits:

```bash
pnpm update:pyapi:models            # fetch the listing, rewrite the snapshot, then the normal pipeline
pnpm update:pyapi:models --report   # fetch the listing, print drift against the snapshot, write nothing
```

TLS is always verified. If Python has no CA bundle (`CERTIFICATE_VERIFY_FAILED`), set `SSL_CERT_FILE` to yours, for example `/etc/ssl/certs/ca-certificates.crt`; without it the fetch uses `certifi` when installed.

`--report` exits 1 when the snapshot has drifted and 2 when the listing can't be fetched or used.
Both make one GET of `OP_SERVER_PROXY`'s models listing, which sets the order and supplies the
descriptions. No credentials, no HTTP proxy, no redirects, a 30 second timeout (`OP_MODELS_TIMEOUT`, in seconds). `pnpm update:pyapi` and `--check` stay offline and read only the
committed snapshot, `scripts/pyapi/models-catalogue.json` (hand-written prose, example inputs, excluded IDs)
and the pinned SDK.

Each base model section also carries the class card its accessors return, when only that base model uses the class, and one example per method its card advertises. The method paths come from the snapshot (`tests/fixtures/models-methods.json`: each model's card in the listing); `--report` compares them. The SDK verb for each path is read from the pinned source, and every example is checked against that source when the sections are generated.

It stops at the two things a person has to decide, and prints them as a to-do list:

- **The SDK changed.** Either that's a real upstream change – confirm it with `pnpm update:pyapi --accept-delta` – or our generator broke. If a class or method was *removed*, a link the site already published is now dead.
- **A class with no home.** Something shows up in a type signature but no page documents it. Add it to `pages.json` and run again; each class you add can pull in more of its own.

</details>
