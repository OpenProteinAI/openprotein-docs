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
import re
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
    rewrite_roles,
    select,
    signature_of,
    type_parts,
)
from sdk import REPO, deref, docstring_text, kind_of, load_sdk  # noqa: E402

ROOT = HERE.parents[1]
SPECS = ROOT / "specs"
GOLDEN = HERE / "golden"
PAGES = HERE / "pages.json"


# NumPy `Parameters\n----------` and Google `Args:` section headers.
SECTION_HEADER = re.compile(
    r"^(?:(Parameters|Returns|Yields|Raises|Warns|Attributes|Other Parameters|Examples|Notes"
    r"|See Also)[ \t]*\n[ \t]*-{3,}[ \t]*$"
    r"|(Args|Arguments|Returns|Yields|Raises|Attributes|Examples?|Notes?):[ \t]*$)",
    re.MULTILINE,
)


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


def build_resolver(package: griffe.Module, manifest: dict):
    """canonical-or-public dotted path -> the public path a reference page documents.

    Two spellings have to resolve to the same target. An annotation's `ExprName` reports the
    path the *annotating* module imported (`openprotein.molecules.Complex`), while the class
    read directly reports its defining module (`openprotein.molecules.complex.Complex`). Both
    are registered, plus every documented member, so a type in a signature can link straight
    to the member that defines it.
    """
    index: dict[str, str] = {}
    owner_page: dict[str, str] = {}
    for page in manifest["pages"]:
        for section in page["sections"]:
            for entry in section["entries"]:
                dotted = entry["target"]
                index[dotted] = dotted
                owner_page[dotted] = page["page"]
                try:
                    obj = deref(lookup(package, dotted))
                except Exception:
                    continue
                canonical = getattr(obj, "canonical_path", None)
                if canonical:
                    index.setdefault(canonical, dotted)

    # The member names of each documented class, so a member reference can be verified
    # before it becomes a link. Selection is cheap and deterministic, so running it here and
    # again during emission costs nothing but keeps the resolver a pure function.
    members: dict[str, set[str]] = {}
    for page in manifest["pages"]:
        for section in page["sections"]:
            for entry in section["entries"]:
                if entry["directive"] != "autoclass":
                    continue
                dotted = entry["target"]
                try:
                    obj = deref(lookup(package, dotted))
                    members[dotted] = {n for n, _, _ in select(package, obj, entry["options"])}
                except Exception:
                    members[dotted] = set()

    # Bare-name index for docstring roles: `:py:class:`Protein``. Ambiguous last components
    # are dropped rather than guessed — a wrong link is worse than a code span.
    by_name: dict[str, dict | None] = {}
    for public, page_name in owner_page.items():
        name = public.rsplit(".", 1)[-1]
        by_name[name] = None if name in by_name else {"path": public, "page": page_name}

    def resolve(path: str) -> dict | None:
        """-> {"path": public dotted path, "page": reference page} or None."""
        # Only ever link into what this site documents; stdlib and third-party names stay plain.
        if not path.startswith("openprotein"):
            return None
        if path in index:
            public = index[path]
            return {"path": public, "page": owner_page[public]}
        # A dotted child of a documented class — but only link it if it is genuinely a
        # documented member. `Type[NullMSA]` resolves to
        # openprotein.molecules.protein.Protein.NullMSA, a nested class autodoc never
        # emitted, and a link to it would land on an anchor that does not exist.
        head, _, tail = path.rpartition(".")
        public = index.get(head)
        if not public or tail not in members.get(public, ()):
            return None
        return {"path": f"{public}.{tail}", "page": owner_page[public]}

    def link(target: str, owner: str | None) -> dict | None:
        """Resolve a docstring role target. Tried in order: as written; as a member of the
        class the docstring belongs to (`get_as_complex` inside `Query`); as a sibling of
        that class in the same module; and finally as a unique bare name anywhere."""
        hit = resolve(target)
        if hit:
            return hit
        if "." not in target:
            if owner:
                cls_path = owner.rsplit(".", 1)[0]
                for candidate in (f"{cls_path}.{target}", f"{cls_path.rsplit('.', 1)[0]}.{target}"):
                    hit = resolve(candidate)
                    if hit:
                        return hit
            return by_name.get(target)
        return None

    return resolve, link


def lookup(package: griffe.Module, dotted: str):
    if dotted == "openprotein":
        return package
    if not dotted.startswith("openprotein."):
        raise KeyError(dotted)
    return package[dotted[len("openprotein.") :]]


def emit_class(package, dotted: str, options: dict, resolve=None, link=None) -> dict:
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
        "bases_parts": [type_parts(b, resolve) for b in (getattr(target, "bases", None) or [])],
        "doc": rewrite_roles(docstring_text(target), dotted, link) or None,
        # The class docstring's own sections. Its `Attributes` section is already folded into
        # members (napoleon turned those into `.. attribute::` directives), but Parameters,
        # Returns, Raises and Examples on a class docstring would otherwise be dropped.
        "parsed": _sections(target, resolve, dotted, link),
        "module": getattr(target, "module", None) and target.module.path,
        "source": _source(target),
        "members": [
            describe(package, target, name, member, extras, resolve, link)
            for name, member, extras in chosen
        ],
    }


def emit_function(package, dotted: str, resolve=None, link=None) -> dict:
    func = deref(lookup(package, dotted))
    return {
        "name": dotted.rsplit(".", 1)[-1],
        "path": dotted,
        "kind": "function",
        "signature": signature_of(func),
        "returns": str(func.returns) if getattr(func, "returns", None) else None,
        "returns_parts": type_parts(getattr(func, "returns", None), resolve),
        "doc": rewrite_roles(docstring_text(func), dotted, link) or None,
        "parsed": _sections(func, resolve, dotted, link),
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
    resolve, link = build_resolver(package, manifest)
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
                        emitted = emit_class(package, dotted, entry["options"], resolve, link)
                    elif entry["directive"] == "autofunction":
                        emitted = emit_function(package, dotted, resolve, link)
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
            emitted = emit_class(package, dotted, {"members": []}, resolve, link)
        except Exception:
            try:
                emitted = emit_function(package, dotted, resolve, link)
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

    # A docstring that carries a section header but parsed to prose means the parser did not
    # recognise its style — 34 were in that state before `parsed_sections` fell back to the
    # explicit parsers, and every one rendered its parameter table as a paragraph.
    unparsed = [
        entry["path"] + ("" if member is None else "." + member["name"])
        for document in documents.values()
        for entry in document["entries"]
        for member in [None, *entry.get("members", [])]
        for doc in [(member or entry).get("doc")]
        if doc
        and len((member or entry).get("parsed") or []) <= 1
        and SECTION_HEADER.search(doc)
    ]
    if unparsed:
        print(f"\n  WARN  {len(unparsed)} docstring(s) have a section header but parsed as prose:")
        for path in unparsed[:10]:
            print(f"          {path}")

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
