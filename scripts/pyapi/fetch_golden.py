#!/usr/bin/env python3
"""Capture what the live Sphinx pages render, as the migration oracle.

The old site is the only ground truth for what `sphinx.ext.autodoc` emitted, and it
disappears when the new site replaces it — so the extraction is committed under
scripts/pyapi/golden/ and the generator is diffed against that, not against the network.

    python3 scripts/pyapi/fetch_golden.py            # fetch, cache the HTML, write golden/
    python3 scripts/pyapi/fetch_golden.py --offline   # re-derive golden/ from the cached HTML

Stdlib only, deliberately: this has to keep working with no environment to set up.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "golden"
CACHE = OUT / "html"
BASE = "https://docs.openprotein.ai/python-api/api-reference"

# The api-reference toctree order, which is also the order the new sidebar must use.
PAGES = [
    "index",
    "openprotein",
    "molecules",
    "data",
    "jobs",
    "align",
    "prompt",
    "embedding",
    "predictor",
    "design",
    "fold",
    "models",
]

KINDS = {"class", "method", "property", "attribute", "function", "data", "exception"}


class Autodoc(HTMLParser):
    """Pulls the `dl.py-*` / `dt[id]` tree autodoc emits out of a rendered page.

    Sphinx nests member `<dl>`s inside their class's `<dd>`, so a stack of open `dl`
    kinds is enough to recover the parent of every entry — no dotted-name guessing,
    which would break on the classes whose members are inherited from another module.
    """

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.entries: list[dict] = []
        self._dl: list[str | None] = []
        self._open: dict | None = None
        self._depth = 0
        self._text: list[str] = []
        self._parents: list[dict] = []
        self._headings: list[dict] = []
        self._heading: str | None = None

    # -- helpers
    @staticmethod
    def _attr(attrs: list[tuple[str, str | None]], name: str) -> str | None:
        for key, value in attrs:
            if key == name:
                return value
        return None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "dl":
            classes = (self._attr(attrs, "class") or "").split()
            kind = next((c for c in classes if c in KINDS), None) if "py" in classes else None
            self._dl.append(kind)
            return

        if tag == "dt" and self._dl and self._dl[-1]:
            anchor = self._attr(attrs, "id")
            if anchor:
                self._open = {"kind": self._dl[-1], "id": anchor, "source": None}
                self._depth = 0
                self._text = []
            return

        if tag in {"h2", "h3", "h4"}:
            self._heading = tag
            self._text = []
            return

        if self._open is not None:
            if tag == "dt":
                self._depth += 1
            # The viewcode [source] link is the only anchor with this class.
            if tag == "a" and "viewcode-link" in (self._attr(attrs, "class") or ""):
                pass
            href = self._attr(attrs, "href") or ""
            if tag == "a" and "_modules/" in href:
                self._open["source"] = href

    def handle_endtag(self, tag: str) -> None:
        if tag == "dl":
            if self._dl:
                self._dl.pop()
            if self._parents and len(self._parents) > len(self._dl):
                self._parents.pop()
            return

        if tag in {"h2", "h3", "h4"} and self._heading == tag:
            text = re.sub(r"\s+", " ", "".join(self._text)).strip().rstrip("#").strip()
            if text:
                self._headings.append({"level": int(tag[1]), "text": text})
            self._heading = None
            self._text = []
            return

        if tag == "dt" and self._open is not None:
            if self._depth:
                self._depth -= 1
                return
            entry = self._open
            entry["signature"] = re.sub(r"\s+", " ", "".join(self._text)).strip().rstrip("#").strip()
            entry["parent"] = self._parents[-1]["id"] if self._parents else None
            self.entries.append(entry)
            if entry["kind"] in {"class", "exception"}:
                self._parents.append(entry)
            self._open = None
            self._text = []

    def handle_data(self, data: str) -> None:
        if self._open is not None or self._heading is not None:
            self._text.append(data)


def fetch(page: str, offline: bool) -> str:
    cached = CACHE / f"{page}.html"
    if offline or cached.exists():
        if not cached.exists():
            sys.exit(f"--offline: {cached.relative_to(ROOT)} is missing; run without --offline once")
        return cached.read_text(encoding="utf-8")
    url = f"{BASE}/{page}.html"
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            body = response.read().decode("utf-8")
    except urllib.error.URLError as error:
        sys.exit(f"cannot fetch {url}: {error}")
    CACHE.mkdir(parents=True, exist_ok=True)
    cached.write_text(body, encoding="utf-8")
    return body


def extract(page: str, html: str) -> dict:
    parser = Autodoc()
    parser.feed(html)
    title = re.search(r"<h1>(.*?)<a class=\"headerlink\"", html, re.S)
    classes: dict[str, dict] = {}
    order: list[str] = []
    loose: list[dict] = []
    for entry in parser.entries:
        if entry["kind"] in {"class", "exception"}:
            classes[entry["id"]] = {
                "name": entry["id"].rsplit(".", 1)[-1],
                "path": entry["id"],
                "kind": entry["kind"],
                "signature": entry["signature"],
                "source": entry["source"],
                "members": [],
            }
            order.append(entry["id"])
        elif entry["parent"] and entry["parent"] in classes:
            classes[entry["parent"]]["members"].append(
                {
                    "name": entry["id"].rsplit(".", 1)[-1],
                    "path": entry["id"],
                    "kind": entry["kind"],
                    "signature": entry["signature"],
                    "source": entry["source"],
                }
            )
        else:
            loose.append(entry)

    anchors = re.findall(r'id="(openprotein[^"]*)"', html)
    return {
        "page": page,
        "title": re.sub(r"<[^>]+>", "", title.group(1)).strip() if title else None,
        "headings": parser._headings,
        "anchor_count": len(anchors),
        "classes": [classes[key] for key in order],
        "module_level": loose,
        "autosummary": autosummary(html),
    }


ROW = re.compile(
    r'<tr[^>]*>\s*<td><p><a[^>]*title="([^"]+)"[^>]*>.*?</a>(.*?)</p></td>\s*'
    r"<td><p>(.*?)</p></td>",
    re.S,
)


def autosummary(html: str) -> list[dict]:
    """The `.. autosummary::` tables, which is all index.html renders.

    Two columns: a linked dotted path with an abbreviated signature, and the docstring's
    first sentence. Captured per table so the order inside each one is preserved.
    """
    tables = []
    for block in re.findall(r'<table class="autosummary[^"]*">(.*?)</table>', html, re.S):
        rows = [
            {
                "path": path,
                "signature": re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", sig)).strip(),
                "summary": re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", text)).strip(),
            }
            for path, sig, text in ROW.findall(block)
        ]
        tables.append(rows)
    return tables


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--offline", action="store_true", help="re-derive from the cached HTML only")
    ap.add_argument("--only", help="comma-separated page names")
    args = ap.parse_args()

    pages = args.only.split(",") if args.only else PAGES
    OUT.mkdir(parents=True, exist_ok=True)
    total_classes = total_members = total_anchors = 0

    for page in pages:
        data = extract(page, fetch(page, args.offline))
        (OUT / f"{page}.json").write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8")
        members = sum(len(c["members"]) for c in data["classes"])
        total_classes += len(data["classes"])
        total_members += members
        total_anchors += data["anchor_count"]
        extra = f"  +{len(data['module_level'])} module-level" if data["module_level"] else ""
        if data["autosummary"]:
            rows = sum(len(t) for t in data["autosummary"])
            extra += f"  {len(data['autosummary'])} autosummary tables / {rows} rows"
        print(
            f"  {page:<14} {len(data['classes']):>3} classes {members:>4} members "
            f"{data['anchor_count']:>4} anchors{extra}"
        )

    print(
        f"\n{len(pages)} pages: {total_classes} classes, {total_members} members, "
        f"{total_anchors} dotted anchors -> {OUT.relative_to(ROOT)}/"
    )


if __name__ == "__main__":
    main()
