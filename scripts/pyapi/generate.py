#!/usr/bin/env python3
"""Generate specs/openprotein.<module>.json for the Python API reference pages.

    .venv-pyapi/bin/python scripts/pyapi/generate.py            # write
    .venv-pyapi/bin/python scripts/pyapi/generate.py --check    # fail if specs/ is stale
    .venv-pyapi/bin/python scripts/pyapi/generate.py --diff     # score against golden/

Static analysis of the installed openprotein-python via griffe; the SDK is never imported.
The curation (which class on which page, in what order, with which autodoc options) comes
from pages.json, not from the SDK.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from importlib.metadata import version
from pathlib import Path

if sys.version_info < (3, 10):
    sys.exit(
        f"scripts/pyapi needs Python >= 3.10 (griffe's floor); this is "
        f"{sys.version_info.major}.{sys.version_info.minor}.\n"
        "The machine default python3 may be older — point the venv at a newer one:\n"
        "  <python3.11+> -m venv .venv-pyapi\n"
        "  .venv-pyapi/bin/pip install -r scripts/pyapi/requirements.txt"
    )

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import griffe  # noqa: E402

from members import (  # noqa: E402
    _sections,
    describe,
    pydantic_signature,
    select,
    signature_of,
)
from sdk import REPO, deref, docstring_text, kind_of, load_sdk  # noqa: E402

ROOT = HERE.parents[1]
SPECS = ROOT / "specs"
GOLDEN = HERE / "golden"
PAGES = HERE / "pages.json"


def site_packages() -> Path:
    for entry in sys.path:
        candidate = Path(entry) / "openprotein" / "__init__.py"
        if candidate.exists():
            return Path(entry)
    sys.exit(
        "openprotein is not importable. Create the pinned venv:\n"
        "  python3 -m venv .venv-pyapi\n"
        "  .venv-pyapi/bin/pip install -r scripts/pyapi/requirements.txt"
    )


def lookup(package: griffe.Module, dotted: str):
    if dotted == "openprotein":
        return package
    if not dotted.startswith("openprotein."):
        raise KeyError(dotted)
    return package[dotted[len("openprotein.") :]]


def emit_class(package, dotted: str, options: dict) -> dict:
    cls = lookup(package, dotted)
    target = deref(cls)
    chosen = select(package, target, options)

    signature = pydantic_signature(target)
    if signature is None:
        init = target.members.get("__init__")
        signature = signature_of(deref(init)) if init is not None else "()"

    bases = [str(b) for b in (getattr(target, "bases", None) or [])]
    return {
        "name": dotted.rsplit(".", 1)[-1],
        "path": dotted,
        "kind": kind_of(cls),
        "signature": signature,
        "bases": bases,
        "doc": docstring_text(target) or None,
        # The class docstring's own sections. Its `Attributes` section is already folded into
        # members (napoleon turned those into `.. attribute::` directives), but Parameters,
        # Returns, Raises and Examples on a class docstring would otherwise be dropped.
        "parsed": _sections(target),
        "module": getattr(target, "module", None) and target.module.path,
        "source": _source(target),
        "members": [describe(package, target, name, member, extras) for name, member, extras in chosen],
    }


def emit_function(package, dotted: str) -> dict:
    func = deref(lookup(package, dotted))
    return {
        "name": dotted.rsplit(".", 1)[-1],
        "path": dotted,
        "kind": "function",
        "signature": signature_of(func),
        "returns": str(func.returns) if getattr(func, "returns", None) else None,
        "doc": docstring_text(func) or None,
        "parsed": _sections(func),
        "source": _source(func),
    }


def _source(target) -> dict | None:
    lineno = getattr(target, "lineno", None)
    if not lineno:
        return None
    try:
        return {
            "file": str(target.relative_package_filepath),
            "line": lineno,
            "end": getattr(target, "endlineno", None) or lineno,
        }
    except Exception:
        return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="fail if specs/ is stale")
    ap.add_argument("--diff", action="store_true", help="score against golden/ and exit")
    ap.add_argument("--only", help="comma-separated page names")
    args = ap.parse_args()

    sdk_version = version("openprotein-python")
    package, tree, shimmed = load_sdk(site_packages())
    if shimmed:
        print(f"  shimmed namespace package(s): {', '.join(shimmed)}")

    manifest = json.loads(PAGES.read_text(encoding="utf-8"))
    wanted = args.only.split(",") if args.only else None

    documents: dict[str, dict] = {}
    per_page: dict[str, list[dict]] = {}
    summarised: set[str] = set()
    for page in manifest["pages"]:
        if wanted and page["page"] not in wanted:
            continue
        entries = []
        for section in page["sections"]:
            for entry in section["entries"]:
                dotted = entry["target"]
                try:
                    if entry["directive"] == "autoclass":
                        emitted = emit_class(package, dotted, entry["options"])
                    elif entry["directive"] == "autofunction":
                        emitted = emit_function(package, dotted)
                    else:
                        continue
                except Exception as error:  # noqa: BLE001
                    print(f"  FAIL {dotted}: {type(error).__name__}: {error}")
                    continue
                emitted["section"] = section["heading"]
                # Which reference page documents this object, so a cross-page autosummary
                # link and any `:py:class:` role can resolve without a second lookup table.
                emitted["page"] = page["page"]
                entries.append(emitted)
                module = dotted.rsplit(".", 1)[0]
                documents.setdefault(module, {"module": module, "entries": []})
                documents[module]["entries"].append(emitted)
        per_page[page["page"]] = entries
        summarised.update(
            dotted
            for section in page["sections"]
            for table in section["autosummary"]
            for dotted in table
        )

    # Second pass, after every page has contributed its documented entries. The index is the
    # FIRST page in the manifest, so doing this inline emitted a stub for every target before
    # its real entry existed — and `readPyEntry` does a `.find()`, so the stub won.
    #
    # Three of the 47 autosummary targets are documented by no `.. autoclass::` at all
    # (svd.SVDAPI, umap.UMAPAPI, predictor.PredictionResultFuture). Sphinx silently dropped
    # those rows — 47 declared, 44 rendered. All three resolve, so emit a summary-only entry
    # and let the new index show all 47.
    documented = {e["path"] for d in documents.values() for e in d["entries"]}
    for dotted in sorted(summarised - documented):
        module = dotted.rsplit(".", 1)[0]
        try:
            emitted = emit_class(package, dotted, {"members": []})
        except Exception:
            try:
                emitted = emit_function(package, dotted)
            except Exception as error:  # noqa: BLE001
                print(f"  FAIL autosummary {dotted}: {type(error).__name__}: {error}")
                continue
        emitted["summary_only"] = True
        emitted["page"] = None
        documents.setdefault(module, {"module": module, "entries": []})
        documents[module]["entries"].append(emitted)

    if args.diff:
        report(per_page)
        return

    SPECS.mkdir(exist_ok=True)
    written = 0
    for module, document in sorted(documents.items()):
        document.update(
            {
                "sdk": {"package": "openprotein-python", "version": sdk_version},
                "source": {"repository": REPO, "ref": f"v{sdk_version}"},
                "generator": f"scripts/pyapi + griffe {version('griffe')}",
            }
        )
        body = json.dumps(document, indent=1, sort_keys=False) + "\n"
        path = SPECS / f"{module}.json"
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != body:
                sys.exit(f"  FAIL {path.relative_to(ROOT)} is stale — rerun without --check")
        else:
            path.write_text(body, encoding="utf-8")
        written += 1

    kinds = Counter(
        m["kind"] for d in documents.values() for e in d["entries"] for m in e.get("members", [])
    )
    total = sum(kinds.values())
    print(
        f"\n{written} module document(s), "
        f"{sum(len(d['entries']) for d in documents.values())} classes/functions, "
        f"{total} members {dict(kinds)}"
    )
    print("--check: specs/ is current" if args.check else f"wrote {written} file(s) to specs/")


def report(per_page: dict[str, list[dict]]) -> None:
    """Score the generated member sets against what the live Sphinx site rendered."""
    exact = drift = 0
    gold_total = got_total = 0
    problems: list[str] = []
    kinds_wrong: list[str] = []

    for page, entries in sorted(per_page.items()):
        path = GOLDEN / f"{page}.json"
        if not path.exists():
            continue
        golden = json.loads(path.read_text(encoding="utf-8"))
        by_path = {c["path"]: c for c in golden["classes"]}
        for entry in entries:
            reference = by_path.get(entry["path"])
            if reference is None:
                continue
            want = {m["name"]: m["kind"] for m in reference["members"]}
            have = {m["name"]: m["kind"] for m in entry.get("members", [])}
            gold_total += len(want)
            got_total += len(have)
            wrong_kind = sorted(
                f"{n}: sphinx={want[n]} ours={have[n]}"
                for n in set(want) & set(have)
                if want[n] != have[n]
            )
            if set(want) == set(have) and not wrong_kind:
                exact += 1
                continue
            drift += 1
            kinds_wrong.extend(f"{entry['path']}.{w}" for w in wrong_kind)
            missing, extra = sorted(set(want) - set(have)), sorted(set(have) - set(want))
            line = f"  {entry['path']}  want={len(want)} have={len(have)}"
            if missing:
                line += f"\n      missing: {', '.join(missing[:10])}"
            if extra:
                line += f"\n      extra  : {', '.join(extra[:10])}"
            if wrong_kind:
                line += f"\n      kind   : {'; '.join(wrong_kind[:6])}"
            problems.append(line)

    print("\n".join(problems))
    print(
        f"\nmember sets: {exact} exact / {exact + drift} classes   "
        f"members {got_total} generated vs {gold_total} rendered by Sphinx"
        + (f"   kind mismatches: {len(kinds_wrong)}" if kinds_wrong else "   kinds all match")
    )


if __name__ == "__main__":
    main()
