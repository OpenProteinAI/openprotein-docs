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
import hashlib
import json
import logging
import re
import ssl
import sys
import urllib.request
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
from sdk import (  # noqa: E402
    REPO,
    SDK_COMMIT,
    SDK_TAG_OBJECT,
    deref,
    docstring_text,
    inherited_member,
    kind_of,
    load_sdk,
)

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
        # The MRO, not `target.members`: `autoclass_content = "class"` picks the class
        # docstring but `autodoc_class_signature = "mixed"` still introspects the runtime
        # class, so an inherited `__init__` supplies the signature. Own-members-only left 11
        # classes rendering `()`, including `OpenProtein`, whose `__init__` lives on
        # `APISession`.
        init = inherited_member(target, "__init__")
        signature = signature_of(init, package) if init is not None else "()"

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
        "signature": signature_of(func, package),
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


# `typing.List` and `list` are the same type; a docstring using the old spelling is not a
# defect. Normalise before comparing, or 26 real drifts hide behind 2 cosmetic ones.
_ALIASES = (("List[", "list["), ("Dict[", "dict["), ("Tuple[", "tuple["), ("Set[", "set["))


def _canon_type(text: str) -> str:
    text = re.sub(r"\s+", "", text)
    for old, new in _ALIASES:
        text = text.replace(old, new)
    return re.sub(r"^Optional\[(.+)\]$", r"\1|None", text)


class _GriffeWarnings(logging.Handler):
    """Capture griffe's docstring warnings instead of only letting them scroll past.

    They are the SDK's own defects — a documented parameter that is not in the signature, or
    one with no type — and they were the only record of them anywhere.
    """

    def __init__(self) -> None:
        super().__init__(level=logging.WARNING)
        self.lines: list[str] = []

    def emit(self, record: logging.LogRecord) -> None:
        message = record.getMessage()
        # griffe prefixes the temp shadow-tree path; make it repo-relative and stable.
        self.lines.append(re.sub(r"^.*?/(openprotein/)", r"\1", message))


def _stale_type_section(per_page: dict[str, list[dict]]) -> list[str]:
    stale = stale_documented_types(per_page)
    if not stale:
        return []
    cell = lambda text: text.replace("|", "\\|")  # noqa: E731
    lines = [
        f"## Documented parameter/return types that disagree with the annotation ({len(stale)})",
        "",
        "The live Sphinx site printed the docstring's type; we print the annotation, because it",
        "is what the code enforces. Where the two disagree the docstring is stale — including two",
        "that are malformed (a default glued into the type, and a trailing comma) and one whose",
        "return description is indented under the underline so the whole line reads as the type.",
        "",
        "| member | parameter | docstring says | annotated as |",
        "|---|---|---|---|",
    ]
    for dotted, name, want, have in sorted(stale):
        lines.append(f"| `{dotted}` | `{name}` | `{cell(want)}` | `{cell(have)}` |")
    lines.append("")
    return lines


def upstream_report(documents: dict[str, dict], warnings: list[str], per_page: dict[str, list[dict]] | None = None) -> str:
    """Enumerate the SDK's own docstring defects, so they can be reported rather than guessed at.

    Phase 7 said "Report those upstream rather than reproducing them" and put the count at nine.
    It is not nine: 26 return types drift from their annotation and griffe raises 10 warnings at
    8 more sites. They surface only as console noise on `sync:pyapi`, so nothing could be filed
    from them. `--upstream` writes this; `UPSTREAM.md` is the committed snapshot.
    """
    drift: list[tuple[str, str, str]] = []
    undocumented_return: list[str] = []
    for document in documents.values():
        for entry in document["entries"]:
            for member in entry.get("members", []):
                if member["kind"] != "method":
                    continue
                annotation = member.get("returns")
                if not annotation:
                    continue
                section = next(
                    (s for s in (member.get("parsed") or []) if s["kind"] == "returns"), None
                )
                dotted = f"{entry['path']}.{member['name']}"
                if section is None:
                    undocumented_return.append(dotted)
                    continue
                for item in section.get("items") or []:
                    documented = item.get("type") if isinstance(item, dict) else None
                    if documented and _canon_type(documented) != _canon_type(annotation):
                        drift.append((dotted, documented, annotation))

    lines = [
        "# Upstream `openprotein-python` docstring defects",
        "",
        "Generated — do not hand-edit. Regenerate with:",
        "",
        "```",
        "pnpm sync:pyapi          # then",
        ".venv-pyapi/bin/python scripts/pyapi/generate.py --upstream > scripts/pyapi/UPSTREAM.md",
        "```",
        "",
        f"Measured against `openprotein-python {version('openprotein-python')}` "
        f"(commit `{SDK_COMMIT[:12]}`). These are reproduced faithfully in the rendered docs, "
        "because the docs are not the place to silently correct the SDK — but each is worth "
        "filing upstream.",
        "",
        f"## Return type drifts from the annotation ({len(drift)})",
        "",
        "napoleon prints the docstring's type, so the live Sphinx site published the left-hand",
        "column. `typing.List`/`Dict`/`Tuple`/`Set`/`Optional` spellings are normalised away first.",
        "",
        "| member | docstring says | annotated as |",
        "|---|---|---|",
    ]
    for dotted, documented, annotation in sorted(drift):
        # A union type contains `|`, which would end the table cell.
        cell = lambda text: text.replace("|", "\\|")  # noqa: E731
        lines.append(f"| `{dotted}` | `{cell(documented)}` | `{cell(annotation)}` |")
    lines += [
        "",
        f"## griffe warnings ({len(warnings)})",
        "",
        "Raised on every `sync:pyapi`. A documented parameter that is not in the signature, or a",
        "documented parameter with no type.",
        "",
        "```",
        *warnings,
        "```",
        "",
        *_stale_type_section(per_page or {}),
        f"## Methods with an annotated return type and no `Returns:` section ({len(undocumented_return)})",
        "",
        "Not a defect in the SDK so much as a gap: `autodoc_typehints_description_target =",
        '"documented"` meant the live site **withheld** these return types, because only a',
        "documented return gets one. We print the annotation instead — strictly more information,",
        "and a deliberate deviation recorded in the skill. Documenting them upstream would make",
        "the two agree.",
        "",
        *[f"- `{d}`" for d in sorted(undocumented_return)],
        "",
    ]
    return "\n".join(lines)


PIN = HERE / "sdk-pin.json"


def verify_pin(packages: Path, online: bool = False) -> int:
    """Re-prove that the installed wheel is the tree the line numbers were computed against.

    The plan's Phase 7 called for source links "pinned to a commit, never a tag ... Then verify
    the downloaded wheel IS that tree, or every line number is quietly wrong." This is that
    verification, made reproducible: `sdk-pin.json` records the sha256 of all 51 SDK files the
    specs line-link, captured from the wheel that was proven byte-identical to SDK_COMMIT.

    Offline it compares hashes, which catches a silently swapped or patched wheel. `--online`
    re-fetches each file from GitHub at SDK_COMMIT and re-proves the commit itself.
    """
    if not PIN.exists():
        print(f"  FAIL {PIN.relative_to(ROOT)} is missing — regenerate it with write_pin()")
        return 1
    pin = json.loads(PIN.read_text(encoding="utf-8"))
    if pin.get("commit") != SDK_COMMIT:
        print(f"  FAIL sdk-pin.json pins {pin.get('commit')} but sdk.py says {SDK_COMMIT}")
        return 1
    context = None
    if online:
        try:
            import certifi  # noqa: PLC0415

            context = ssl.create_default_context(cafile=certifi.where())
        except Exception:  # noqa: BLE001
            context = ssl.create_default_context()

    bad: list[str] = []
    for relative, want in sorted(pin["files"].items()):
        local = packages / relative
        if not local.exists():
            bad.append(f"{relative}: absent from the installed wheel")
            continue
        blob = local.read_bytes()
        got = hashlib.sha256(blob).hexdigest()
        if got != want:
            bad.append(f"{relative}: sha256 {got[:12]} != pinned {want[:12]}")
            continue
        if online:
            url = f"https://raw.githubusercontent.com/{REPO.split('github.com/')[1]}/{SDK_COMMIT}/{relative}"
            try:
                remote = urllib.request.urlopen(url, timeout=30, context=context).read()
            except ssl.SSLError as error:
                # This interpreter has no usable CA bundle — the pixi-built 3.13 does not.
                # One message, not 51: the offline hashes are the committed evidence anyway.
                print(
                    f"  SKIP --online: TLS verification is unavailable in this interpreter "
                    f"({error.reason if hasattr(error, 'reason') else error}).\n"
                    f"        Install certifi in the venv, or re-run with a system python:\n"
                    f"          python3 scripts/pyapi/generate.py --verify-pin --online"
                )
                online = False
                continue
            except Exception as error:  # noqa: BLE001
                bad.append(f"{relative}: could not fetch at {SDK_COMMIT[:12]} ({error})")
                continue
            if remote != blob:
                bad.append(f"{relative}: differs from {SDK_COMMIT[:12]} on GitHub")
    for line in bad:
        print(f"  FAIL {line}")
    where = "GitHub" if online else "sdk-pin.json"
    print(
        f"\n{len(pin['files']) - len(bad)}/{len(pin['files'])} line-linked SDK files match "
        f"{where} at {SDK_COMMIT[:12]}"
        + ("" if bad else " — every [source] line number is anchored")
    )
    return 1 if bad else 0


def write_pin(packages: Path) -> None:
    """Recapture sdk-pin.json from the installed wheel. Run after an SDK bump, and re-prove the
    new commit with `--verify-pin --online` before trusting it.
    """
    files: dict[str, str] = {}
    for path in sorted(SPECS.glob("openprotein*.json")):
        document = json.loads(path.read_text(encoding="utf-8"))
        for entry in document["entries"]:
            for obj in [entry, *entry.get("members", [])]:
                source = obj.get("source")
                if not source or not source.get("file"):
                    continue
                relative = source["file"]
                if relative in files:
                    continue
                blob = (packages / relative).read_bytes()
                files[relative] = hashlib.sha256(blob).hexdigest()
    PIN.write_text(
        json.dumps(
            {
                "package": "openprotein-python",
                "version": version("openprotein-python"),
                "commit": SDK_COMMIT,
                "tag_object": SDK_TAG_OBJECT,
                "note": (
                    "sha256 of every SDK file the specs line-link, from the wheel proven "
                    "byte-identical to `commit`. Verify with "
                    "`generate.py --verify-pin [--online]`."
                ),
                "files": dict(sorted(files.items())),
            },
            indent=1,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"  wrote {PIN.relative_to(ROOT)} — {len(files)} file(s)")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="fail if specs/ is stale")
    ap.add_argument("--diff", action="store_true", help="score against golden/ and exit")
    ap.add_argument("--only", help="comma-separated page names")
    ap.add_argument(
        "--upstream",
        action="store_true",
        help="write the upstream SDK defect report to stdout and exit",
    )
    ap.add_argument(
        "--verify-pin",
        action="store_true",
        help="check the installed SDK still matches sdk-pin.json, then exit",
    )
    ap.add_argument(
        "--online",
        action="store_true",
        help="with --verify-pin, also re-fetch every file from GitHub at SDK_COMMIT",
    )
    args = ap.parse_args()

    # site_packages() prints the venv recipe when the SDK is absent; `version()` would raise
    # PackageNotFoundError one line earlier and make that recipe dead code.
    packages = site_packages()
    sdk_version = version("openprotein-python")
    if args.verify_pin:
        sys.exit(verify_pin(packages, args.online))

    griffe_warnings = _GriffeWarnings()
    logging.getLogger("griffe").addHandler(griffe_warnings)
    package, tree, shimmed = load_sdk(packages)
    if shimmed and not args.upstream:
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
                # `ref` is the COMMIT, not the tag: line numbers are only meaningful
                # against one exact tree. `tag` is carried for provenance.
                "source": {
                    "repository": REPO,
                    "ref": SDK_COMMIT,
                    "tag": f"v{sdk_version}",
                },
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

    if args.upstream:
        # Not `report` — that shadows the module-level report() for the whole function and
        # makes the --diff path raise UnboundLocalError.
        rendered = upstream_report(documents, sorted(set(griffe_warnings.lines)), per_page)
        target = HERE / "UPSTREAM.md"
        if args.check:
            if not target.exists() or target.read_text(encoding="utf-8") != rendered:
                sys.exit(
                    f"  FAIL {target.relative_to(ROOT)} is stale — "
                    "rerun `pnpm upstream:pyapi`"
                )
            print(f"--upstream --check: {target.relative_to(ROOT)} is current")
            return
        target.write_text(rendered, encoding="utf-8")
        print(f"  wrote {target.relative_to(ROOT)}")
        return

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


# Sphinx renders a signature as `class openprotein.fold.FoldAPI(session)[source]`,
# `fold(sequences, num_recycles=10)[source]`, `property msa: str | None` or `boltz2: Boltz2Model`.
# Reduce each to the part we emit so the two can be compared.
_SIG_PREFIX = re.compile(r"^(classmethod|staticmethod|static|abstract|async|property|attribute)\s+")


def golden_signature(kind: str, rendered: str | None, name: str, dotted: str) -> str | None:
    if rendered is None:
        return None
    text = rendered.replace("[source]", "").strip()
    if kind == "class":
        return re.sub(r"^class\s+", "", text).replace(dotted, "", 1).strip() or "()"
    if kind in {"property", "attribute"}:
        text = _SIG_PREFIX.sub("", text)
        return text.split(":", 1)[1].strip() if ":" in text else None
    text = _SIG_PREFIX.sub("", text).strip()
    # A module-level function is rendered fully qualified (`openprotein.connect(...)`);
    # a method is rendered bare (`fold(...)`).
    for prefix in (dotted, name):
        if text.startswith(prefix + "("):
            text = text[len(prefix) :]
            break
    return text.strip()


# Differences that are not defects, keyed by the reason. Asserted as *expected*, so a change
# in either direction shows up.
#
# `typed-beyond-sphinx`: napoleon's `.. attribute::` directives and pydantic's fields carry no
# type on the live page; we print the real annotation. Strictly more informative.
# `overload-primary`: Sphinx rendered the first `@overload` — annotated, with a return arrow —
# as the member's signature. We render the implementation signature, which is what you can
# actually call, and list every overload beside it rather than only the first.
EXPECTED_SIGNATURE_DRIFT = {
    "typed-beyond-sphinx": lambda want, have: want is None and bool(have),
    "overload-primary": lambda want, have: bool(want) and "\u2192" in want,
}


# napoleon renders the NumPy `param : int, optional` / `bool, default=True` suffix into the
# type string; griffe keeps the type and the default apart, and we emit the default in its own
# field. Strip the suffix before comparing, or 335 of 341 "mismatches" are that one convention.
_DOC_TYPE_SUFFIX = re.compile(
    r"\s*(?:,\s*optional|,?\s*default\s*[=:].*|=\s*[^,]+)\s*\.?$", re.I
)


def _canon_doc_type(text: str | None) -> str:
    if not text:
        return ""
    text = _DOC_TYPE_SUFFIX.sub("", text.strip()).rstrip(".")
    # napoleon prints the docstring's `or`; griffe renders a union as `|`. Same type.
    text = re.sub(r"\s+or\s+", "|", text)
    # `list of str` and `list[str]` are the same type written two ways.
    text = re.sub(r"\b(list|sequence|tuple|set|dict)\s+of\s+(\w[\w.\[\]]*)", r"\1[\2]", text, flags=re.I)
    return _canon_type(text)


# Documented-type differences that are not defects on our side. Asserted as *expected*, so a
# change in either direction surfaces.
#
# `griffe-tuple-normalised`: griffe parses a NumPy choice set or comma list
#   (`{'mlm', 'clm'} or None`, `int, str, optional`) into a tuple expression, losing the braces
#   and the `or None`. A griffe limitation, not something to out-parse — 540 parameters go
#   through the same path.
# `docstring-stale`: the docstring's type disagrees with the annotation and we print the
#   annotation. Every one is an upstream defect, enumerated in UPSTREAM.md.
EXPECTED_TYPE_DRIFT = {
    "griffe-tuple-normalised": lambda want, have: bool(have)
    and have.startswith("(")
    and have.endswith(")"),
    "docstring-stale": lambda want, have: True,
}


def stale_documented_types(per_page: dict[str, list[dict]]) -> list[tuple[str, str, str, str]]:
    """Parameters and returns whose documented type disagrees with the annotation.

    We print the annotation, because it is what the code actually enforces; the live Sphinx
    page printed the docstring. Each of these is an upstream defect.
    """
    out: list[tuple[str, str, str, str]] = []
    for page, entries in sorted(per_page.items()):
        path = GOLDEN / f"{page}.json"
        if not path.exists():
            continue
        golden = json.loads(path.read_text(encoding="utf-8"))
        reference: dict[str, dict] = {}
        for cls in golden["classes"]:
            reference[cls["path"]] = cls.get("fields") or {}
            for member in cls["members"]:
                reference[member["path"]] = member.get("fields") or {}
        for member in golden.get("module_level") or []:
            reference[member["id"]] = member.get("fields") or {}
        for entry in entries:
            for dotted, obj in [(entry["path"], entry)] + [
                (f"{entry['path']}.{m['name']}", m) for m in entry.get("members", [])
            ]:
                fields = reference.get(dotted)
                if not fields:
                    continue
                ours = {
                    item["name"]: item.get("type")
                    for section in (obj.get("parsed") or [])
                    if section["kind"] in {"parameters", "other parameters"}
                    for item in (section.get("items") or [])
                    if isinstance(item, dict) and item.get("name")
                }
                for row in fields.get("parameters") or []:
                    want, have = row.get("type"), ours.get(row["name"])
                    if not want or row["name"] not in ours:
                        continue
                    if _canon_doc_type(want) == _canon_doc_type(have):
                        continue
                    if have and have.startswith("(") and have.endswith(")"):
                        continue  # griffe tuple normalisation, not an upstream defect
                    out.append((dotted, row["name"], want, have or "(none)"))
                want_return = fields.get("return_type")
                if want_return:
                    have_return = next(
                        (
                            (item.get("type") if isinstance(item, dict) else None)
                            for section in (obj.get("parsed") or [])
                            if section["kind"] == "returns"
                            for item in (section.get("items") or [])
                        ),
                        None,
                    )
                    if _canon_doc_type(want_return) != _canon_doc_type(have_return):
                        out.append((dotted, "-> return", want_return, have_return or "(none)"))
    return out


def score_types(per_page: dict[str, list[dict]]) -> list[str]:
    """Compare every documented parameter and return **type** against the live page.

    The last clause of the plan's Phase 7 verify step, and the one that stayed unmet longest:
    `autodoc_typehints = "description"` put these types in the `<dd>` field list, which the
    oracle originally discarded at capture time, so they could not be compared at all.
    `fetch_golden.py:field_list()` now records them — 540 parameters, 192 return types and 49
    raises across 198 entries.
    """
    exact = 0
    missing = 0
    expected = Counter()
    mismatch: list[str] = []

    for page, entries in sorted(per_page.items()):
        path = GOLDEN / f"{page}.json"
        if not path.exists():
            continue
        golden = json.loads(path.read_text(encoding="utf-8"))
        reference: dict[str, dict] = {}
        for cls in golden["classes"]:
            reference[cls["path"]] = cls.get("fields") or {}
            for member in cls["members"]:
                reference[member["path"]] = member.get("fields") or {}
        for member in golden.get("module_level") or []:
            reference[member["id"]] = member.get("fields") or {}

        for entry in entries:
            for dotted, obj in [(entry["path"], entry)] + [
                (f"{entry['path']}.{m['name']}", m) for m in entry.get("members", [])
            ]:
                fields = reference.get(dotted)
                if not fields:
                    continue
                ours: dict[str, str | None] = {}
                for section in obj.get("parsed") or []:
                    if section["kind"] not in {"parameters", "other parameters"}:
                        continue
                    for item in section.get("items") or []:
                        if isinstance(item, dict) and item.get("name"):
                            ours[item["name"]] = item.get("type")
                for row in fields.get("parameters") or []:
                    want = row.get("type")
                    if want is None:
                        continue
                    if row["name"] not in ours:
                        missing += 1
                        mismatch.append(f"  {dotted}({row['name']}): absent from our parameters")
                        continue
                    have = ours[row["name"]]
                    if _canon_doc_type(want) == _canon_doc_type(have):
                        exact += 1
                    else:
                        for reason, matches in EXPECTED_TYPE_DRIFT.items():
                            if matches(want, have):
                                expected[reason] += 1
                                break
                        else:
                            mismatch.append(
                                f"  {dotted}({row['name']})\n      sphinx: {want}"
                                f"\n      ours  : {have}"
                            )
                want_return = fields.get("return_type")
                if want_return:
                    have_return = next(
                        (
                            (item.get("type") if isinstance(item, dict) else None)
                            for section in (obj.get("parsed") or [])
                            if section["kind"] == "returns"
                            for item in (section.get("items") or [])
                        ),
                        None,
                    )
                    if _canon_doc_type(want_return) == _canon_doc_type(have_return):
                        exact += 1
                    else:
                        expected["docstring-stale"] += 1

    total = exact + sum(expected.values()) + len(mismatch)
    return [
        *mismatch,
        f"\ndocumented types: {exact} exact / {total}   "
        + ", ".join(f"{n} {r}" for r, n in sorted(expected.items()))
        + (f"   UNEXPECTED: {len(mismatch)}" if mismatch else "   no unexpected drift"),
    ]


def score_signatures(per_page: dict[str, list[dict]]) -> list[str]:
    """Compare every emitted signature and type against the one Sphinx rendered.

    The plan's Phase 7 verify step asks for member list, order, signatures AND types; only the
    first two were ever scored. Adding this found 44 real regressions — unresolved constant
    defaults (`interval=config.POLLING_INTERVAL` for `interval=5`), 11 classes rendering `()`
    because their `__init__` is inherited (`OpenProtein` among them), pydantic fields printed
    without their defaults or wrapped in `Field(...)`, and `job_id` losing its `str`.
    """
    exact = 0
    unexpected: list[str] = []
    expected = Counter()

    for page, entries in sorted(per_page.items()):
        path = GOLDEN / f"{page}.json"
        if not path.exists():
            continue
        golden = json.loads(path.read_text(encoding="utf-8"))
        reference: dict[str, tuple[str, str | None]] = {}
        for cls in golden["classes"]:
            reference[cls["path"]] = ("class", cls.get("signature"))
            for member in cls["members"]:
                reference[member["path"]] = (member["kind"], member.get("signature"))
        for member in golden.get("module_level") or []:
            reference[member["id"]] = (member.get("kind", "function"), member.get("signature"))

        for entry in entries:
            pairs = [(entry["path"], "class", entry.get("signature"))]
            for member in entry.get("members", []):
                dotted = f"{entry['path']}.{member['name']}"
                if member["kind"] == "method":
                    have = member.get("signature")
                else:
                    # Sphinx prints an attribute as `name: Type = value`; we split the two,
                    # so recombine before comparing or `model_config` reads as a mismatch.
                    have = member.get("annotation")
                    if have and member.get("value") is not None:
                        have = f"{have} = {member['value']}"
                pairs.append((dotted, member["kind"], have))
            for dotted, _kind, have in pairs:
                if dotted not in reference:
                    continue
                gold_kind, rendered = reference[dotted]
                want = golden_signature(gold_kind, rendered, dotted.rsplit(".", 1)[-1], dotted)
                if _squash(want) == _squash(have):
                    exact += 1
                    continue
                for reason, matches in EXPECTED_SIGNATURE_DRIFT.items():
                    if matches(want, have):
                        expected[reason] += 1
                        break
                else:
                    unexpected.append(f"  {dotted}\n      sphinx: {want}\n      ours  : {have}")

    total = exact + sum(expected.values()) + len(unexpected)
    lines = list(unexpected)
    lines.append(
        f"\nsignatures & types: {exact} exact / {total}   "
        + ", ".join(f"{n} {r}" for r, n in sorted(expected.items()))
        + (f"   UNEXPECTED: {len(unexpected)}" if unexpected else "   no unexpected drift")
    )
    return lines


def _squash(text: str | None) -> str | None:
    return None if text is None else re.sub(r"\s+", "", text)


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

    # Member order, which the set comparison above cannot see.
    order_wrong = []
    for page, entries in sorted(per_page.items()):
        path = GOLDEN / f"{page}.json"
        if not path.exists():
            continue
        by_path = {
            c["path"]: [m["path"].rsplit(".", 1)[-1] for m in c["members"]]
            for c in json.loads(path.read_text(encoding="utf-8"))["classes"]
        }
        for entry in entries:
            want = by_path.get(entry["path"])
            have = [m["name"] for m in entry.get("members", [])]
            if want is not None and set(want) == set(have) and want != have:
                order_wrong.append(entry["path"])
    print(
        f"member order: {exact + drift - len(order_wrong)} match / {exact + drift}"
        + (f"   differs: {', '.join(order_wrong)}" if order_wrong else "")
    )

    print("\n".join(score_signatures(per_page)))
    print("\n".join(score_types(per_page)))


if __name__ == "__main__":
    main()
