#!/usr/bin/env python3
"""Lift the curation out of the old .rst pages into scripts/pyapi/pages.json.

The 11 reference pages are hand-curated: which classes appear, in what order, under which
section heading, and with which autodoc options. None of that is derivable from the SDK, and
__old/ is deleted at the end of the migration — so it is extracted once, committed, and
hand-maintained from then on. This script exists for provenance, not as part of the build.

    python3 scripts/pyapi/extract_manifest.py [--check]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "__old" / "source" / "python-api" / "api-reference"
OUT = Path(__file__).resolve().parent / "pages.json"

# api-reference toctree order.
PAGES = [
    "index", "openprotein", "molecules", "data", "jobs", "align",
    "prompt", "embedding", "predictor", "design", "fold", "models",
]

DIRECTIVE = re.compile(r"^\.\. (auto\w+):: *(.+?) *$")
OPTION = re.compile(r"^ +:([\w-]+): *(.*)$")
# RST underline: 3+ of one punctuation char, and the line above is the heading text.
UNDERLINE = re.compile(r"^([=\-~^\"'`#*+])\1{2,} *$")

# Sphinx assigns section levels by first-seen punctuation, per document.
def heading_levels(lines: list[str]) -> dict[int, tuple[int, str]]:
    seen: list[str] = []
    out: dict[int, tuple[int, str]] = {}
    for i, line in enumerate(lines[1:], start=1):
        if not UNDERLINE.match(line) or not lines[i - 1].strip():
            continue
        char = line.strip()[0]
        if char not in seen:
            seen.append(char)
        out[i - 1] = (seen.index(char) + 1, lines[i - 1].strip())
    return out


def parse_options(lines: list[str], start: int) -> tuple[dict, int]:
    options: dict[str, object] = {}
    i = start
    while i < len(lines):
        match = OPTION.match(lines[i])
        if not match:
            if lines[i].strip() == "":
                i += 1
                continue
            break
        name, raw = match.group(1), match.group(2).strip()
        if name in {"members", "exclude-members", "special-members", "private-members"}:
            options[name] = [v.strip() for v in raw.split(",") if v.strip()] if raw else True
        elif raw:
            options[name] = raw
        else:
            options[name] = True
        i += 1
    return options, i


DOC_ROLE = re.compile(r":doc:`([^<`]+?)\s*<([^>`]+)>`")
PY_ROLE = re.compile(r":py:(?:class|meth|func|attr|obj|mod):`~?([^`]+)`")


def rewrite_roles(text: str) -> str:
    """RST roles the reference prose uses, as MDX. Only two forms occur."""
    text = DOC_ROLE.sub(lambda m: f"[{m.group(1).strip()}](./{m.group(2).strip()})", text)
    return PY_ROLE.sub(lambda m: f"[`{m.group(1).split('.')[-1]}`](#{m.group(1)})", text)


def parse(page: str) -> dict:
    lines = (SRC / f"{page}.rst").read_text(encoding="utf-8").split("\n")
    levels = heading_levels(lines)
    title = levels.get(next(iter(levels), -1), (0, page))[1] if levels else page

    sections: list[dict] = []
    current = {"heading": None, "level": 0, "prose": [], "entries": [], "autosummary": []}
    i = 0
    first = next(iter(levels), -1)
    while i < len(lines):
        if i in levels:
            # Always skip the heading line and its underline, title included — otherwise the
            # title text and its `====` rule land in the first section's prose.
            if i != first:
                level, text = levels[i]
                sections.append(current)
                current = {
                    "heading": text,
                    "level": level,
                    "prose": [],
                    "entries": [],
                    "autosummary": [],
                }
            i += 2
            continue

        directive = DIRECTIVE.match(lines[i])
        if directive:
            kind, target = directive.group(1), directive.group(2).strip()
            options, i = parse_options(lines, i + 1)
            current["entries"].append(
                {"directive": kind, "target": target.rstrip("()"), "options": options}
            )
            continue

        if lines[i].strip() == ".. autosummary::":
            i += 1
            entries = []
            while i < len(lines) and (not lines[i].strip() or lines[i].startswith("   ")):
                value = lines[i].strip()
                if value and not value.startswith(":"):
                    entries.append(value)
                i += 1
            current["autosummary"].append(entries)
            continue

        # Skip the toctree on index and any other directive block wholesale.
        if lines[i].startswith(".. ") and "::" in lines[i]:
            i += 1
            while i < len(lines) and (not lines[i].strip() or lines[i].startswith("   ")):
                i += 1
            continue

        text = lines[i].strip()
        if text:
            current["prose"].append(rewrite_roles(text))
        i += 1

    sections.append(current)
    sections = [s for s in sections if s["prose"] or s["entries"] or s["autosummary"]]
    for s in sections:
        s["prose"] = " ".join(s["prose"]) or None
    return {"page": page, "title": title, "sections": sections}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="fail if pages.json is stale")
    args = ap.parse_args()

    manifest = {"source": "__old/source/python-api/api-reference", "pages": [parse(p) for p in PAGES]}
    body = json.dumps(manifest, indent=1) + "\n"

    classes = sum(
        1 for p in manifest["pages"] for s in p["sections"] for e in s["entries"] if e["directive"] == "autoclass"
    )
    other = sum(
        1 for p in manifest["pages"] for s in p["sections"] for e in s["entries"] if e["directive"] != "autoclass"
    )
    rows = sum(len(t) for p in manifest["pages"] for s in p["sections"] for t in s["autosummary"])
    for p in manifest["pages"]:
        n = sum(len(s["entries"]) for s in p["sections"])
        a = sum(len(t) for s in p["sections"] for t in s["autosummary"])
        print(f"  {p['page']:<14} {len(p['sections']):>2} sections {n:>3} directives {a:>3} autosummary rows")
    print(f"\n{classes} autoclass + {other} other directives, {rows} autosummary rows")

    if args.check:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != body:
            sys.exit(f"\n{OUT.relative_to(ROOT)} is stale — rerun without --check")
        print(f"--check: {OUT.relative_to(ROOT)} is current")
        return
    OUT.write_text(body, encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
