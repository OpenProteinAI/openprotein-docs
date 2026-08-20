#!/usr/bin/env python3
"""Seed content/docs/python-api/api-reference/*.mdx from pages.json.

The curation and the prose both came out of the old .rst; this writes them into MDX once so
the pages become ordinary hand-maintained content. Refuses to overwrite by default, so a
hand edit is never clobbered.

    python3 scripts/pyapi/seed_pages.py [--force] [--only fold,models]
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "content" / "docs" / "python-api" / "api-reference"
PAGES = HERE / "pages.json"
GOLDEN = HERE / "golden"

DIRECTIVE_COMPONENT = {"autoclass": "PyClass", "autofunction": "PyFunction"}
SPECS = ROOT / "specs"

DEFAULT_DESCRIPTION = {
    "index": "Every class and function in the openprotein Python client, by module.",
}

ANCHOR = re.compile(r"\[`([^`]+)`\]\(#(openprotein[\w.]+)\)")


def documented() -> dict[str, str | None]:
    """dotted path -> reference page, from the generated specs."""
    out: dict[str, str | None] = {}
    for path in sorted(SPECS.glob("openprotein*.json")):
        for entry in json.loads(path.read_text(encoding="utf-8"))["entries"]:
            out[entry["path"]] = entry.get("page")
    return out


def resolve_links(text: str, pages: dict[str, str | None], page: str) -> str:
    """Point a `:py:class:` role at the page that documents it.

    The extractor turns every role into a same-page anchor, which is wrong whenever the
    target lives elsewhere — and two targets on the openprotein page
    (`openprotein.Protein`, `openprotein.Model`) are documented nowhere at all, so the old
    site shipped those as dead links. Emit a plain code span for those rather than a link
    that goes nowhere.
    """

    def replace(match: re.Match[str]) -> str:
        label, dotted = match.group(1), match.group(2)
        owner = pages.get(dotted)
        if dotted not in pages or owner is None:
            return f"`{label}`"
        if owner == page:
            return f"[`{label}`](#{dotted})"
        return f"[`{label}`](/python-api/api-reference/{owner}#{dotted})"

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


def body(page: dict, pages: dict[str, str | None]) -> str:
    lines: list[str] = []
    seen: dict[str, int] = {}
    for section in page["sections"]:
        directives = [e for e in section["entries"] if e["directive"] in DIRECTIVE_COMPONENT]
        prose = resolve_links(section["prose"], pages, page["page"]) if section["prose"] else None

        # A section that documents objects becomes a collapsible <PyGroup>, which renders the
        # heading itself. Sections that only carry prose or autosummary tables keep an
        # ordinary markdown heading.
        if directives and section["heading"]:
            anchors = ",\n    ".join(quote(e["target"]) for e in directives)
            lines += [
                "",
                f'<PyGroup id="{slugify(section["heading"], seen)}" title={quote(section["heading"])}',
                f"  anchors={{[\n    {anchors},\n  ]}}",
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
        for table in section["autosummary"]:
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
    ap.add_argument("--only", help="comma-separated page names")
    args = ap.parse_args()

    manifest = json.loads(PAGES.read_text(encoding="utf-8"))
    wanted = args.only.split(",") if args.only else None
    OUT.mkdir(parents=True, exist_ok=True)

    pages = documented()
    written = skipped = 0
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
        if target.exists() and not args.force:
            skipped += 1
            continue

        # The intro paragraph stays in the body, links and all. It used to be de-duplicated
        # against the frontmatter description, but that quietly discarded the whole paragraph
        # whenever the intro was a single sentence — losing `[align](./align)` from fold and
        # both PoET links from prompt. The route suppresses the visible subtitle on these
        # pages instead, so nothing is printed twice; the description still feeds <meta>,
        # the sidebar and search.
        text = body(page, pages)
        target.write_text("\n".join(front) + text, encoding="utf-8")
        written += 1

    # "index" is deliberately absent: fumadocs links the folder itself to its index page, so
    # listing it as a child renders "API reference" twice in the sidebar and the breadcrumb.
    meta = {
        "title": "API reference",
        "pages": [p["page"] for p in manifest["pages"] if p["page"] != "index"],
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {written} page(s), skipped {skipped} existing, refreshed meta.json")


if __name__ == "__main__":
    main()
