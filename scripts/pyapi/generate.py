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
import subprocess
import sys
import urllib.request
from collections import Counter, defaultdict
from importlib.metadata import distribution, version
from pathlib import Path

if sys.version_info < (3, 10):
    sys.exit(
        f"scripts/pyapi needs Python >= 3.10 (griffe's floor); this is "
        f"{sys.version_info.major}.{sys.version_info.minor}.\n"
        "See README.md for the fresh-environment bootstrap."
    )

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import griffe  # noqa: E402

from members import (  # noqa: E402
    _sections,
    describe,
    pydantic_signature,
    parameter_sections,
    overload_contract,
    rewrite_roles,
    select,
    signature_of,
    type_parts,
)
from sdk import (  # noqa: E402
    INSTALL_REPO,
    REPO,
    SDK_COMMIT,
    SDK_BRANCH,
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
MODULE_NAME = re.compile(r"openprotein(?:\.[A-Za-z_]\w*)*\Z")


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
        "openprotein is not installed. See README.md for the fresh-environment bootstrap."
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
        try:
            canonical = getattr(deref(lookup(package, path)), "canonical_path", None)
        except (AttributeError, KeyError, griffe.GriffeError):
            canonical = None
        if canonical in index:
            public = index[canonical]
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

    raw_bases = getattr(target, "bases", None) or []
    bases = [str(b) for b in raw_bases]
    display_bases = [b for b in raw_bases if getattr(b, "canonical_path", None)
                     != "openprotein.molecules.chains._BasicSerde"]
    private_structure_field = target.path in {
        "openprotein.molecules.chains.DNA", "openprotein.molecules.chains.RNA",
        "openprotein.molecules.chains.Ligand",
    }
    display_signature = signature_of(init, package, {"_structure_block"}) if private_structure_field else signature
    new = deref(target.members["__new__"]) if "__new__" in target.members else None
    constructors = getattr(new, "overloads", None) or []
    init = inherited_member(target, "__init__")
    sections = parameter_sections(_sections(target, resolve, dotted, link), init, resolve) if init is not None else _sections(target, resolve, dotted, link)
    if private_structure_field:
        for section in sections:
            if section["kind"] in {"parameters", "other parameters"}:
                section["items"] = [item for item in section["items"] if item.get("name") != "_structure_block"]
    return {
        "name": dotted.rsplit(".", 1)[-1],
        "path": dotted,
        "kind": kind_of(cls),
        **({"overload_contracts": [overload_contract(o, package, resolve) for o in constructors]} if constructors else {}),
        "signature": signature,
        **({"display_signature": display_signature} if display_signature != signature else {}),
        "bases": bases,
        "bases_parts": [type_parts(b, resolve, target.parent) for b in display_bases],
        "doc": rewrite_roles(docstring_text(target), dotted, link) or None,
        # The class docstring's own sections. Its `Attributes` section is already folded into
        # members (napoleon turned those into `.. attribute::` directives), but Parameters,
        # Returns, Raises and Examples on a class docstring would otherwise be dropped.
        "parsed": sections,
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
        "parsed": parameter_sections(_sections(func, resolve, dotted, link), func, resolve),
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


# `typing.List` and `list` are the same type; normalise before comparing.
_ALIASES = (("List[", "list["), ("Dict[", "dict["), ("Tuple[", "tuple["), ("Set[", "set["))


def _canon_type(text: str) -> str:
    text = re.sub(r"\s+", "", text)
    for old, new in _ALIASES:
        text = text.replace(old, new)
    return re.sub(r"^Optional\[(.+)\]$", r"\1|None", text)


class _GriffeWarnings(logging.Handler):
    """Capture griffe's docstring warnings instead of letting them scroll past."""

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
    """The SDK's own docstring defects, so they can be filed rather than guessed at.

    26 return-type drifts plus 10 griffe warnings at 8 sites; console noise until now.
    `UPSTREAM.md` is the committed snapshot.
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
        ".venv-pyapi/bin/python scripts/pyapi/generate.py --upstream",
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


def validate_source_identity(raw: str | None) -> None:
    """Reject an installation from a different tree, even at the same package version."""
    try:
        direct = json.loads(raw or "null")
        vcs = direct["vcs_info"]
        if (direct["url"].removesuffix(".git") != INSTALL_REPO
                or vcs["vcs"] != "git" or vcs["commit_id"] != SDK_COMMIT):
            raise ValueError("repository, VCS or commit mismatch; set OP_SDK_GIT_URL to its repository")
    except (ValueError, KeyError, TypeError, AttributeError) as error:
        raise SystemExit(f"FAIL installed SDK direct_url.json identity: {error}") from error


def source_metadata(sdk_version: str) -> dict[str, str]:
    source = {"repository": REPO, "ref": SDK_COMMIT}
    if SDK_BRANCH:
        source["branch"] = SDK_BRANCH
    else:
        source["tag"] = f"v{sdk_version}"
    return source


def verify_pin(packages: Path, online: bool = False) -> int:
    """Verify installed file hashes and, optionally, the authenticated source tree."""
    if SDK_BRANCH:
        validate_source_identity(distribution("openprotein-python").read_text("direct_url.json"))
    if not PIN.exists():
        print(f"  FAIL {PIN.relative_to(ROOT)} is missing — regenerate it with --write-pin")
        return 1
    pin = json.loads(PIN.read_text(encoding="utf-8"))
    if pin.get("commit") != SDK_COMMIT:
        print(f"  FAIL sdk-pin.json pins {pin.get('commit')} but sdk.py says {SDK_COMMIT}")
        return 1
    if SDK_BRANCH and (pin.get("repository") != REPO or pin.get("branch") != SDK_BRANCH
                       or pin.get("version") != version("openprotein-python")):
        print("  FAIL sdk-pin.json source identity or version does not match installed SDK")
        return 1
    remote = None
    context = None
    if online and SDK_BRANCH:
        try:
            result = subprocess.run(
                ["gh", "api", f"repos/{INSTALL_REPO.split('github.com/')[1]}/git/trees/{SDK_COMMIT}?recursive=1"],
                check=True, capture_output=True, text=True,
            )
            tree = json.loads(result.stdout)
            if tree.get("truncated") is not False or not isinstance(tree.get("tree"), list):
                raise ValueError("missing or truncated GitHub tree")
            remote = {item["path"]: item["sha"] for item in tree["tree"] if item["type"] == "blob"}
        except (OSError, subprocess.CalledProcessError, ValueError, KeyError) as error:
            print(f"  FAIL authenticated GitHub tree verification unavailable: {error}")
            return 1
    elif online:
        try:
            import certifi  # noqa: PLC0415
            context = ssl.create_default_context(cafile=certifi.where())
        except Exception:  # noqa: BLE001
            context = ssl.create_default_context()

    bad: list[str] = []
    for relative, want in sorted(pin["files"].items()):
        local = packages / relative
        if not local.exists():
            bad.append(f"{relative}: absent from the installed SDK")
            continue
        blob = local.read_bytes()
        got = hashlib.sha256(blob).hexdigest()
        if got != want:
            bad.append(f"{relative}: sha256 {got[:12]} != pinned {want[:12]}")
            continue
        if remote is not None:
            sha = hashlib.sha1(f"blob {len(blob)}\0".encode() + blob).hexdigest()
            if remote.get(relative) != sha:
                bad.append(f"{relative}: differs from GitHub tree")
        elif online:
            url = f"https://raw.githubusercontent.com/{INSTALL_REPO.split('github.com/')[1]}/{SDK_COMMIT}/{relative}"
            try:
                fetched = urllib.request.urlopen(url, timeout=30, context=context).read()
                if fetched != blob:
                    bad.append(f"{relative}: differs from GitHub tree")
            except Exception as error:  # noqa: BLE001
                bad.append(f"{relative}: could not fetch source ({error})")
    for line in bad:
        print(f"  FAIL {line}")
    where = "GitHub" if online else "sdk-pin.json"
    print(f"\n{len(pin['files']) - len(bad)}/{len(pin['files'])} line-linked SDK files match "
          f"{where} at {SDK_COMMIT[:12]}" + ("" if bad else " — every [source] line number is anchored"))
    return 1 if bad else 0


def write_pin(packages: Path) -> None:
    """Recapture hashes from the installed SDK after generating specs."""
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
                **({"repository": REPO, "branch": SDK_BRANCH} if SDK_BRANCH else {"tag_object": SDK_TAG_OBJECT}),
                "note": "sha256 of every SDK file the specs line-link. Verify with `generate.py --verify-pin [--online]`.",
                "files": dict(sorted(files.items())),
            },
            indent=1,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"  wrote {PIN.relative_to(ROOT)} — {len(files)} file(s)")


def _owned_specs() -> set[Path]:
    owned: set[Path] = set()
    if not SPECS.exists():
        return owned
    for path in SPECS.iterdir():
        if path.is_symlink() or not path.is_file() or not path.name.endswith(".json"):
            continue
        module = path.name[:-5]
        if not MODULE_NAME.fullmatch(module):
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            continue
        if not isinstance(data, dict):
            continue
        generator = data.get("generator")
        sdk = data.get("sdk")
        if (data.get("module") == module and isinstance(generator, str)
                and generator.startswith("scripts/pyapi + griffe ")
                and isinstance(sdk, dict) and sdk.get("package") == "openprotein-python"):
            owned.add(path)
    return owned


def _sync_specs(bodies: dict[str, str], *, check: bool, prune: bool) -> None:
    if any(not MODULE_NAME.fullmatch(module) for module in bodies):
        raise ValueError("invalid generated Python module name")
    outputs = {SPECS / f"{module}.json": body for module, body in bodies.items()}
    if any(path.is_symlink() for path in outputs):
        raise ValueError("generated Python spec output is a symlink")
    owned = _owned_specs()
    if prune and owned and not outputs:
        raise ValueError("refusing an empty full generation over existing Python specs")
    obsolete = owned - outputs.keys() if prune else set()
    if check:
        stale = [path.name for path, body in outputs.items()
                 if not path.exists() or path.read_text(encoding="utf-8") != body]
        if stale or obsolete:
            raise SystemExit(f"FAIL stale Python specs: {', '.join(sorted(stale))}; obsolete: {', '.join(sorted(p.name for p in obsolete))}")
        return
    SPECS.mkdir(parents=True, exist_ok=True)
    for path, body in outputs.items():
        path.write_text(body, encoding="utf-8")
    for path in sorted(obsolete):
        path.unlink()


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
    ap.add_argument(
        "--write-pin",
        action="store_true",
        help="recapture sdk-pin.json from the installed SDK after generation",
    )
    ap.add_argument(
        "--delta",
        action="store_true",
        help="propose sdk-delta.json from what the SDK changed since golden/; exits 1 if unrecorded",
    )
    ap.add_argument(
        "--holes",
        action="store_true",
        help="report SDK classes a page prints but nothing documents; exits 1 if any",
    )
    ap.add_argument(
        "--write",
        action="store_true",
        help="with --delta, record the proposal in sdk-delta.json",
    )
    args = ap.parse_args()
    if args.check and (args.write_pin or args.write):
        ap.error("--check cannot record pins or deltas")

    # site_packages() prints the venv recipe when the SDK is absent; `version()` would raise
    # PackageNotFoundError one line earlier and make that recipe dead code.
    packages = site_packages()
    sdk_version = version("openprotein-python")
    if SDK_BRANCH:
        validate_source_identity(distribution("openprotein-python").read_text("direct_url.json"))
        if not PIN.exists():
            sys.exit("FAIL source pin is missing")
        pin = json.loads(PIN.read_text(encoding="utf-8"))
        if (pin.get("repository") != REPO or pin.get("branch") != SDK_BRANCH
                or not isinstance(pin.get("commit"), str)
                or not re.fullmatch(r"[a-f0-9]{40}", pin["commit"])
                or (pin.get("commit") != SDK_COMMIT and not args.write_pin)):
            sys.exit("FAIL sdk-pin.json source identity does not match sdk.py")
    if args.verify_pin:
        sys.exit(verify_pin(packages, args.online))
    # Reads specs/, so it runs *after* a sync — the file list is "what the specs line-link".
    if args.write_pin:
        write_pin(packages)
        sys.exit(verify_pin(packages, args.online))

    griffe_warnings = _GriffeWarnings()
    logging.getLogger("griffe").addHandler(griffe_warnings)
    package, tree, shimmed = load_sdk(packages)
    if shimmed and not args.upstream:
        print(f"  shimmed namespace package(s): {', '.join(shimmed)}")

    manifest = json.loads(PAGES.read_text(encoding="utf-8"))
    resolve, link = build_resolver(package, manifest)
    wanted = args.only.split(",") if args.only is not None else None
    known_pages = {page["page"] for page in manifest["pages"]}
    if wanted is not None and any(not name or name not in known_pages for name in wanted):
        ap.error("--only must name existing pages")

    failures: list[str] = []
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
                    failures.append(f"{dotted}: {type(error).__name__}: {error}")
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
                failures.append(f"{dotted}: {type(error).__name__}: {error}")
                continue
        emitted["summary_only"] = True
        emitted["page"] = None
        documents.setdefault(module, {"module": module, "entries": []})
        documents[module]["entries"].append(emitted)

    if failures:
        raise SystemExit(f"FAIL {len(failures)} Python API extraction(s); no specs written")

    if args.diff:
        report(per_page)
        return
    if args.delta:
        sys.exit(report_delta(per_page, args.write))
    if args.holes:
        sys.exit(report_holes(package, per_page))

    if args.upstream:
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

    bodies: dict[str, str] = {}
    for module, document in sorted(documents.items()):
        document.update({
            "sdk": {"package": "openprotein-python", "version": sdk_version},
            "source": source_metadata(sdk_version),
            "generator": f"scripts/pyapi + griffe {version('griffe')}",
        })
        bodies[module] = json.dumps(document, indent=1, sort_keys=False) + "\n"
    _sync_specs(bodies, check=args.check, prune=args.only is None)
    written = len(bodies)

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


# golden/ is frozen at the SDK the Sphinx site documented; sdk-delta.json names what the SDK has
# changed since, so subtracting it scores that surface exactly and the rest still reads UNEXPECTED.
DELTA_PATH = HERE / "sdk-delta.json"
DELTA = json.loads(DELTA_PATH.read_text(encoding="utf-8"))
DELTA_ADDED: dict[str, set[str]] = {k: set(v) for k, v in DELTA["members_added"].items()}
DELTA_REMOVED: dict[str, set[str]] = {k: set(v) for k, v in DELTA["members_removed"].items()}
DELTA_LABEL = f"sdk-{DELTA['sdk_version']}"


def as_of_oracle(path: str, names: list[str]) -> list[str]:
    """The members this class had in the SDK the oracle captured, in emitted order."""
    added = DELTA_ADDED.get(path, ())
    return [n for n in names if n not in added] + sorted(DELTA_REMOVED.get(path, ()))


# Not defects, asserted as expected so a change either way shows up. `typed-beyond-sphinx`: we
# print an annotation the live page left blank. `overload-primary`: Sphinx showed the first
# @overload, we show the implementation plus every overload.
EXPECTED_SIGNATURE_DRIFT = {
    "typed-beyond-sphinx": lambda want, have: want is None and bool(have),
    "overload-primary": lambda want, have: bool(want) and "\u2192" in want,
}


# napoleon folds `, optional` / `, default=X` into the type string; griffe keeps them apart.
# Strip before comparing, or 335 of 341 "mismatches" are that convention.
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


# Not defects on our side. `griffe-tuple-normalised`: griffe parses a NumPy choice set into a
# tuple, losing the braces and `or None`. `docstring-stale`: upstream, see UPSTREAM.md.
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


# SDK source replaced these old parameter descriptions alongside its API changes.
SDK_REMOVED_DOCUMENTED_PARAMETERS = {
    ("openprotein.svd.SVDModel.fit_umap", "reduction"),
    ("openprotein.fold.FoldResultFuture.get_item", "sequence"),
}

def score_types(per_page: dict[str, list[dict]]) -> list[str]:
    """Compare every documented parameter and return type against the live page.

    `autodoc_typehints = "description"` put these in the `<dd>` field list, which the oracle
    discarded until `fetch_golden.py:field_list()` started recording it.
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
                        if (dotted, row["name"]) in SDK_REMOVED_DOCUMENTED_PARAMETERS:
                            expected["sdk-removed-parameter"] += 1
                            continue
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


def curated_additions(path: str) -> set[str]:
    manifest = json.loads(PAGES.read_text(encoding="utf-8"))
    for page in manifest["pages"]:
        for section in page["sections"]:
            for entry in section["entries"]:
                if entry["target"] == path:
                    return set(entry["options"].get("publish-members") or []) - set(DELTA["members_added"].get(path, []))
    return set()


def compute_delta(per_page: dict[str, list[dict]]) -> dict:
    """Propose reference differences from golden/; recording requires review."""
    added: dict[str, list[str]] = {}
    removed: dict[str, list[str]] = {}
    changed: dict[str, dict[str, str]] = {}

    for page, entries in sorted(per_page.items()):
        reference = golden_reference(page)
        if reference is None:
            continue
        golden = json.loads((GOLDEN / f"{page}.json").read_text(encoding="utf-8"))
        by_path = {c["path"]: c for c in golden["classes"]}
        for entry in entries:
            source = by_path.get(entry["path"])
            if source is not None:
                want = {m["name"] for m in source["members"]}
                have = {m["name"] for m in entry.get("members", [])}
                additions = have - want - curated_additions(entry["path"])
                if additions:
                    added[entry["path"]] = sorted(additions)
                if want - have:
                    removed[entry["path"]] = sorted(want - have)
            for dotted, _kind, have_sig in signature_pairs(entry):
                if dotted not in reference:
                    continue
                gold_kind, rendered = reference[dotted]
                want_sig = golden_signature(gold_kind, rendered, dotted.rsplit(".", 1)[-1], dotted)
                if _squash(want_sig) == _squash(have_sig):
                    continue
                if any(m(want_sig, have_sig) for m in EXPECTED_SIGNATURE_DRIFT.values()):
                    continue
                changed[dotted] = {"sphinx": want_sig, "ours": have_sig}

    return {
        "oracle_version": DELTA["oracle_version"],
        "sdk_version": version("openprotein-python"),
        "note": "Reviewed SDK, curation, and extraction differences from the frozen Sphinx reference in golden/. Unlisted differences remain unexpected; update only after source and historical-link review.",
        "members_added": dict(sorted(added.items())),
        "members_removed": dict(sorted(removed.items())),
        "signatures_changed": dict(sorted(changed.items())),
    }


def report_delta(per_page: dict[str, list[dict]], write: bool) -> int:
    proposed = compute_delta(per_page)
    current = {k: DELTA.get(k) for k in ("members_added", "members_removed", "signatures_changed")}
    fresh = {k: proposed[k] for k in current}
    if current == fresh and proposed["sdk_version"] == DELTA["sdk_version"]:
        print("  sdk-delta.json matches the SDK — nothing to record")
        return 0

    for key, label in (("members_added", "added"), ("members_removed", "REMOVED")):
        for path, names in fresh[key].items():
            was = set(current[key].get(path, []))
            new = [n for n in names if n not in was]
            if new:
                print(f"  {label:8} {path}: {', '.join(new)}")
    for dotted, pair in fresh["signatures_changed"].items():
        if current["signatures_changed"].get(dotted) != pair:
            print(f"  changed  {dotted}\n      sphinx: {pair['sphinx']}\n      ours  : {pair['ours']}")

    if fresh["members_removed"]:
        print(
            "\n  members_removed is not routine: a member golden/ published and the SDK no longer\n"
            "  has means a deep link this site promised is dead. Decide before recording it."
        )
    if not write:
        print("\n  re-run with --write to record this in sdk-delta.json")
        return 1
    DELTA_PATH.write_text(json.dumps(proposed, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\n  wrote {DELTA_PATH.relative_to(ROOT)}")
    return 0


def report_holes(package: griffe.Module, per_page: dict[str, list[dict]]) -> int:
    """Names the pages print but cannot link, because nothing documents them.

    This is how a class the SDK ships stays invisible for a whole release: `ProtenixV2Model`
    was printed as `FoldAPI.protenix_v2`'s type since 0.16.1 and linked nowhere. A type token
    with no `path` naming an SDK class is the signal.
    """
    sdk_classes: set[str] = set()

    def walk(module) -> None:
        for member in module.members.values():
            try:
                target = deref(member)
            except Exception:  # noqa: BLE001
                continue
            # canonical_path, not the name: a module re-exporting `requests.HTTPError` makes it
            # a member here, and a third-party class is correctly left unlinked.
            if target.kind is griffe.Kind.CLASS:
                if str(getattr(target, "canonical_path", "")).startswith("openprotein"):
                    sdk_classes.add(target.name)
            elif target.kind is griffe.Kind.MODULE and target.filepath and "openprotein" in str(
                target.filepath
            ):
                walk(target)

    walk(package)
    documented = {e["path"].rsplit(".", 1)[-1] for entries in per_page.values() for e in entries}
    # Nested classes autodoc never emitted: `Protein.NullMSA`, `ModelCriterion.Criterion
    # .DirectionEnum`. A link would land on an anchor that does not exist — see the skill.
    nested = {"NullMSA", "DirectionEnum"}

    sites: dict[str, set[str]] = defaultdict(set)

    def scan(parts, where) -> None:
        for token in parts or []:
            if isinstance(token, list):  # bases_parts is a list of token lists
                scan(token, where)
                continue
            if token.get("path"):
                continue
            for name in re.findall(r"\b[A-Z][A-Za-z0-9_]*\b", token.get("text", "")):
                if name in sdk_classes and name not in documented and name not in nested:
                    sites[name].add(where)

    def scan_sections(sections, where) -> None:
        for section in sections or []:
            for item in section.get("items") or []:
                if isinstance(item, dict) and not item.get("annotation_fallback"):
                    scan(item.get("type_parts"), where)

    for entries in per_page.values():
        for entry in entries:
            if entry.get("summary_only"):
                continue
            scan(entry.get("bases_parts"), entry["path"])
            scan_sections(entry.get("parsed"), entry["path"])
            for member in entry.get("members", []):
                at = f"{entry['path']}.{member['name']}"
                scan(member.get("annotation_parts"), at)
                scan(member.get("returns_parts"), at)
                scan_sections(member.get("parsed"), at)

    for name in sorted(sites, key=lambda n: (-len(sites[n]), n)):
        where = sorted(sites[name])
        print(f"  {name:32} {len(where):3} site(s)   e.g. {where[0]}")
    print(
        f"\n{len(sites)} SDK class(es) printed by a page and linked nowhere"
        + ("" if sites else " — existing documented types resolve; inferred parameter types excluded")
    )
    return 1 if sites else 0


def signature_pairs(entry: dict) -> list[tuple[str, str, str | None]]:
    """(dotted path, kind, the signature we emit) for a class and each of its members."""
    pairs = [(entry["path"], "class", entry.get("signature"))]
    for member in entry.get("members", []):
        if member["kind"] == "method":
            have = member.get("signature")
        else:
            # Sphinx prints an attribute as `name: Type = value`; we split the two, so
            # recombine before comparing or `model_config` reads as a mismatch.
            have = member.get("annotation")
            if have and member.get("value") is not None:
                have = f"{have} = {member['value']}"
        pairs.append((f"{entry['path']}.{member['name']}", member["kind"], have))
    return pairs


def golden_reference(page: str) -> dict[str, tuple[str, str | None]] | None:
    """dotted path -> (kind, rendered signature), for everything golden/ captured on a page."""
    path = GOLDEN / f"{page}.json"
    if not path.exists():
        return None
    golden = json.loads(path.read_text(encoding="utf-8"))
    reference: dict[str, tuple[str, str | None]] = {}
    for cls in golden["classes"]:
        reference[cls["path"]] = ("class", cls.get("signature"))
        for member in cls["members"]:
            reference[member["path"]] = (member["kind"], member.get("signature"))
    for member in golden.get("module_level") or []:
        reference[member["id"]] = (member.get("kind", "function"), member.get("signature"))
    return reference


def score_signatures(per_page: dict[str, list[dict]]) -> list[str]:
    """Compare every emitted signature and type against the one Sphinx rendered.

    Unscored until it was added, and it found 44 regressions — see the skill's oracle.md.
    """
    exact = 0
    unexpected: list[str] = []
    expected = Counter()

    for page, entries in sorted(per_page.items()):
        reference = golden_reference(page)
        if reference is None:
            continue
        for entry in entries:
            for dotted, _kind, have in signature_pairs(entry):
                if dotted not in reference:
                    continue
                gold_kind, rendered = reference[dotted]
                want = golden_signature(gold_kind, rendered, dotted.rsplit(".", 1)[-1], dotted)
                if _squash(want) == _squash(have):
                    exact += 1
                    continue
                changed = DELTA["signatures_changed"].get(dotted) or {}
                if (_squash(changed.get("sphinx")), _squash(changed.get("ours"))) == (
                    _squash(want),
                    _squash(have),
                ):
                    expected[DELTA_LABEL] += 1
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
    gold_total = got_total = delta_total = curated_total = 0
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
            # Score the surface the oracle saw; the SDK's additions since are counted separately.
            then = set(as_of_oracle(entry["path"], list(have))) - (curated_additions(entry["path"]) - set(want))
            curated_count = len((set(have) - set(want)) & curated_additions(entry["path"]))
            curated_total += curated_count
            delta_total += len(have) - len(then & set(have)) - curated_count
            wrong_kind = sorted(
                f"{n}: sphinx={want[n]} ours={have[n]}"
                for n in set(want) & set(have) & then
                if want[n] != have[n]
            )
            if set(want) == then and not wrong_kind:
                exact += 1
                continue
            drift += 1
            kinds_wrong.extend(f"{entry['path']}.{w}" for w in wrong_kind)
            missing, extra = sorted(set(want) - then), sorted(then - set(want))
            line = f"  {entry['path']}  want={len(want)} have={len(then)}"
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
        + (f" + {delta_total} {DELTA_LABEL}" if delta_total else "")
        + (f" + {curated_total} curated" if curated_total else "")
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
            have = as_of_oracle(entry["path"], [m["name"] for m in entry.get("members", [])])
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
