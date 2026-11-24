#!/usr/bin/env python3
"""Write content/docs/references/python-api/*.mdx from pages.json.

`--sync` rewrites each page BODY from the curation and leaves the frontmatter alone, so
adding a class is a one-line pages.json edit rather than three edits that must agree (the
directive, the <PyClass> line, and the path inside <PyGroup anchors={[…]}>). Everything the
generator cannot know now lives in pages.json itself, so nothing is lost by regenerating.

    python3 scripts/pyapi/seed_pages.py --sync            # rewrite bodies, keep frontmatter
    python3 scripts/pyapi/seed_pages.py --sync --check    # fail if a body is stale
    python3 scripts/pyapi/seed_pages.py [--force]         # (re)seed whole files, frontmatter too
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "content" / "docs" / "references" / "python-api"
# The site serves OUT here; lib/site.ts PY_API_URL must agree.
URL_BASE = "/references/python-api"
PAGES = HERE / "pages.json"
GOLDEN = HERE / "golden"

DIRECTIVE_COMPONENT = {"autoclass": "PyClass", "autofunction": "PyFunction"}
SPECS = ROOT / "specs"

DEFAULT_DESCRIPTION = {
    "index": "Every class and function in the openprotein Python client, by module.",
}

ANCHOR = re.compile(r"\[`([^`]+)`\]\(#(openprotein[\w.]+)\)")
PLAIN_TARGETS = {"openprotein.Protein", "openprotein.Model"}


def documented() -> dict[str, str | None]:
    """Published class, function and member paths mapped to their reference page."""
    out: dict[str, str | None] = {}

    def add(dotted: str, page: str) -> None:
        if dotted in out and out[dotted] != page:
            raise ValueError(f"{dotted}: published on both {out[dotted]} and {page}")
        out[dotted] = page

    for path in sorted(SPECS.glob("openprotein*.json")):
        for entry in json.loads(path.read_text(encoding="utf-8"))["entries"]:
            page = entry.get("page")
            if entry.get("summary_only") or not page:
                continue
            add(entry["path"], page)
            for member in entry.get("members", []):
                add(f"{entry['path']}.{member['name']}", page)
    return out


def resolve_links(text: str, pages: dict[str, str | None], page: str) -> str:
    """Resolve curated Python links against published reference anchors."""
    def replace(match: re.Match[str]) -> str:
        label, dotted = match.group(1), match.group(2)
        owner = pages.get(dotted)
        if not owner:
            if dotted in PLAIN_TARGETS:
                return f"`{label}`"
            raise ValueError(f"{page}: no published Python API anchor for {dotted}")
        if owner == page:
            return f"[`{label}`](#{dotted})"
        return f"[`{label}`]({URL_BASE}/{owner}#{dotted})"

    return ANCHOR.sub(replace, text)


LINK = re.compile(r"\[([^\]]+)\]\([^)]+\)")


def sentence(text: str | None) -> str:
    """First sentence, as plain text — the description also becomes a `<meta>` tag, so
    markdown links and code spans have no business in it."""
    if not text:
        return ""
    first = text.strip().split(". ")[0].strip()
    first = LINK.sub(r"\1", first).replace("`", "")
    return first if first.endswith(".") else f"{first}."


def plain(text: str) -> str:
    return LINK.sub(r"\1", text).replace("`", "").strip()


def quote(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def slugify(text: str, seen: dict[str, int]) -> str:
    """Same slug rehype-slug would have produced, so `#models` still resolves after the
    heading moved from MDX into <PyGroup>, with its `-1` suffix for a repeat.

    models.rst has two sections called "Results" (RFdiffusion's and BoltzGen's), and index.rst
    has two called "Models". Sphinx numbered both seconds `#id1` — a generic fallback nobody
    links deliberately — so matching rehype-slug's `results-1` / `models-1` is both a better
    anchor and consistent with every other page on this site. `seen` is shared across the whole
    page, so those two are the only anchors this migration changes.
    """
    base = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    count = seen.get(base, 0)
    seen[base] = count + 1
    return base if count == 0 else f"{base}-{count}"


def catalogue(manifest: dict) -> dict[str, list[str]]:
    """page -> every class and function it documents, in page order."""
    return {
        p["page"]: [e["target"] for s in p["sections"] for e in s["entries"] if e["directive"] in DIRECTIVE_COMPONENT]
        for p in manifest["pages"]
    }


def index_mismatch(manifest: dict) -> str | None:
    """The index has one section per sidebar page, in sidebar order."""
    index = next((p for p in manifest["pages"] if p["page"] == "index"), None)
    if index is None:
        return None
    want = [p["page"] for p in manifest["pages"] if p["page"] != "index"]
    got = [s["summarises"] for s in index["sections"] if s.get("summarises")]
    if got == want:
        return None
    return f"index summarises {got}, sidebar lists {want}"


def body(page: dict, pages: dict[str, str | None], manifest: dict) -> str:
    tables = catalogue(manifest)
    titles = {p["page"]: p["title"] for p in manifest["pages"]}
    lines: list[str] = []
    seen: dict[str, int] = {}
    for section in page["sections"]:
        directives = [e for e in section["entries"] if e["directive"] in DIRECTIVE_COMPONENT]
        prose = resolve_links(section["prose"], pages, page["page"]) if section["prose"] else None
        autosummary = section["autosummary"]
        if summarised := section.get("summarises"):
            autosummary = [tables[summarised]]
            link = f"Full reference: [`{titles[summarised]}`]({URL_BASE}/{summarised})."
            prose = f"{prose} {link}" if prose else link

        # A section that documents objects becomes a collapsible <PyGroup>, which renders the
        # heading itself; `nested` also groups a section with no classes, one level down.
        # Sections that only carry prose or autosummary tables keep an ordinary heading.
        nested = section.get("nested", False)
        if (directives or nested) and section["heading"]:
            anchors = ",\n    ".join(quote(e["target"]) for e in directives)
            slug = slugify(section["heading"], seen)
            if section.get("id"):
                seen[section["id"]] = seen.get(section["id"], 0) + 1
            lines += [
                "",
                f'<PyGroup id="{section.get("id") or slug}" title={quote(section["heading"])}'
                + (" level={3}" if nested else ""),
                f"  anchors={{[\n    {anchors},\n  ]}}" if directives else "  anchors={[]}",
                ">",
                "",
            ]
            if prose:
                lines += [prose, ""]
            for entry in directives:
                lines.append(f'<{DIRECTIVE_COMPONENT[entry["directive"]]} path="{entry["target"]}" />')
            lines += ["", "</PyGroup>", ""]
            continue

        if section["heading"]:
            slugify(section["heading"], seen)  # keep the slug namespace in step
            level = min(max(section["level"], 2), 4)
            lines += ["", f"{'#' * level} {section['heading']}", ""]
        if prose:
            lines += [prose, ""]
        for table in autosummary:
            entries = ",\n    ".join(quote(t) for t in table)
            lines += ["<PySummary", f"  paths={{[\n    {entries},\n  ]}}", "/>", ""]
        for entry in directives:
            lines.append(f'<{DIRECTIVE_COMPONENT[entry["directive"]]} path="{entry["target"]}" />')
        if directives:
            lines.append("")
    # Collapse runs of blank lines.
    out: list[str] = []
    for line in lines:
        if line == "" and out and out[-1] == "":
            continue
        out.append(line)
    return "\n".join(out).strip() + "\n"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="overwrite existing .mdx")
    ap.add_argument("--sync", action="store_true", help="rewrite bodies only, keeping frontmatter")
    ap.add_argument("--check", action="store_true", help="with --sync, fail if a body is stale")
    ap.add_argument("--only", help="comma-separated page names")
    args = ap.parse_args()
    if args.check and not args.sync:
        ap.error("--check requires --sync")
    manifest = json.loads(PAGES.read_text(encoding="utf-8"))
    wanted = args.only.split(",") if args.only is not None else None
    known_pages = {page["page"] for page in manifest["pages"]}
    if wanted is not None and any(not name or name not in known_pages for name in wanted):
        ap.error("--only must name existing pages")

    if mismatch := index_mismatch(manifest):
        sys.exit(f"FAIL {mismatch}")

    pages = documented()
    pending: dict[Path, str] = {}
    skipped = 0
    for page in manifest["pages"]:
        name = page["page"]
        if wanted and name not in wanted:
            continue

        golden_path = GOLDEN / f"{name}.json"
        title = page["title"]
        if golden_path.exists():
            title = json.loads(golden_path.read_text(encoding="utf-8"))["title"] or title

        preamble = next((s for s in page["sections"] if s["heading"] is None), None)
        intro = preamble["prose"] if preamble else None
        front = [
            "---",
            f"title: {quote(title)}",
            f"description: {quote(sentence(resolve_links(intro or '', pages, name)) or DEFAULT_DESCRIPTION.get(name, f'API reference for {title}.'))}",
            "pythonApi: true",
            "---",
            "",
        ]
        target = OUT / f"{name}.mdx"
        if target.exists() and not args.sync and not args.force:
            skipped += 1
            continue
        current = target.read_text(encoding="utf-8") if target.exists() else None
        if args.sync and current is not None:
            _, _, rest = current.partition("---\n")
            frontmatter = "---\n" + rest.split("---\n", 1)[0] + "---\n"
            desired = frontmatter + body(page, pages, manifest)
        else:
            # The intro paragraph stays in the body, links and all. It used to be de-duplicated
            # against the frontmatter description, but that quietly discarded the whole paragraph
            # whenever the intro was a single sentence — losing `[align](./align)` from fold and
            # both PoET links from prompt. The route suppresses the visible subtitle on these
            # pages instead, so nothing is printed twice; the description still feeds <meta>,
            # the sidebar and search.
            desired = "\n".join(front) + body(page, pages, manifest)
        if desired == current:
            skipped += 1
        else:
            pending[target] = desired

    # "index" is deliberately absent: fumadocs links the folder itself to its index page, so
    # listing it as a child renders "API reference" twice in the sidebar and the breadcrumb.
    meta = {
        "title": "Python API",
        "pages": [p["page"] for p in manifest["pages"] if p["page"] != "index"],
    }
    meta_path = OUT / "meta.json"
    meta_text = json.dumps(meta, indent=2) + "\n"
    meta_changed = not meta_path.exists() or meta_path.read_text(encoding="utf-8") != meta_text
    if args.check:
        stale = [path.name for path in pending]
        if meta_changed:
            stale.append("meta.json")
        if stale:
            sys.exit(f"FAIL stale Python API outputs: {', '.join(stale)}")
        print("Python API page bodies and metadata are current")
        return
    OUT.mkdir(parents=True, exist_ok=True)
    for path, text in pending.items():
        path.write_text(text, encoding="utf-8")
    if meta_changed:
        meta_path.write_text(meta_text, encoding="utf-8")
    verb = "rewrote" if args.sync else "wrote"
    print(f"{verb} {len(pending)} page(s), {skipped} already current, checked meta.json")


if __name__ == "__main__":
    main()
