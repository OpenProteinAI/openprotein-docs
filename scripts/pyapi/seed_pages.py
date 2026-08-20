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


def body(page: dict, pages: dict[str, str | None]) -> str:
    lines: list[str] = []
    for section in page["sections"]:
        if section["heading"]:
            level = min(max(section["level"], 2), 4)
            lines += ["", f"{'#' * level} {section['heading']}", ""]
        if section["prose"]:
            lines += [resolve_links(section["prose"], pages, page["page"]), ""]
        for table in section["autosummary"]:
            entries = ",\n    ".join(quote(t) for t in table)
            lines += ["<PySummary", f"  paths={{[\n    {entries},\n  ]}}", "/>", ""]
        for entry in section["entries"]:
            component = DIRECTIVE_COMPONENT.get(entry["directive"])
            if not component:
                continue
            lines.append(f'<{component} path="{entry["target"]}" />')
        if section["entries"]:
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

        text = body(page, pages)
        # The frontmatter description renders directly under the h1, so a body that opens
        # with the same sentence prints it twice.
        summary = sentence(resolve_links(intro or "", pages, name))
        if summary:
            first = text.split("\n", 1)[0]
            # Drop only the duplicated *sentence*, not the whole paragraph — the openprotein
            # page's opening paragraph carries a second sentence that must survive.
            head, sep, tail = first.partition(". ")
            if plain(head).startswith(plain(summary).rstrip(".")):
                remainder = tail.strip()
                text = (remainder + text[len(first) :]).lstrip() if sep else text[len(first) :].lstrip()
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
