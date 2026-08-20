"""Loading the SDK with griffe, and the five things griffe does not hand you directly.

Static analysis only — the SDK is never imported. Everything here was verified against the
live Sphinx output for openprotein-python 0.16.1; see README.md.
"""

from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

import griffe

PACKAGE = "openprotein"

# The public re-export path is what the .rst documents; griffe reports the defining module.
REPO = "https://github.com/OpenProteinAI/openprotein-python"


def load_sdk(site_packages: Path) -> tuple[griffe.Module, Path, list[str]]:
    """Load `openprotein` into a shadow tree, shimming implicit namespace packages.

    `openprotein/models/foundation/` has no `__init__.py` — a PEP 420 namespace package.
    griffe's finder will not walk into one, so `openprotein.models` comes back without a
    `foundation` member and the six aliases pointing through it raise AliasResolutionError
    the moment anything touches `.docstring` or `.filepath`. That silently breaks five of
    the seven classes on the models page.

    Copying the tree and writing empty `__init__.py` files is the whole fix: an empty
    `__init__.py` changes nothing about what the modules contain, and at runtime Python
    treats the directory as a package either way. The shims are returned so the caller can
    report them — a new one appearing is worth knowing about.
    """
    tree = Path(tempfile.mkdtemp(prefix="pyapi-sdk-")).resolve()
    shutil.copytree(
        site_packages / PACKAGE, tree / PACKAGE, ignore=shutil.ignore_patterns("__pycache__")
    )

    shimmed = []
    for directory in sorted(p for p in (tree / PACKAGE).rglob("*") if p.is_dir()):
        if (directory / "__init__.py").exists():
            continue
        if any(f.suffix == ".py" for f in directory.iterdir()):
            (directory / "__init__.py").write_text("")
            shimmed.append(str(directory.relative_to(tree)))

    package = griffe.load(
        PACKAGE,
        search_paths=[tree],
        # Parser.auto, not Parser.google: this SDK is ~123 NumPy / ~20 Google docstrings, and
        # google-only parsing drops ~86 Parameters, ~113 Returns and ~33 Raises sections on
        # the floor. auto is the griffe equivalent of the sphinx.ext.napoleon the old site ran.
        docstring_parser=griffe.Parser.auto,
        resolve_aliases=True,
        resolve_external=False,
    )
    return package, tree, shimmed


def deref(obj):
    """Members reached through an alias ARE aliases, so isinstance() checks collapse.

    `openprotein.data.AssayDataset` is an alias, and so is every member read off it —
    `isinstance(m, Function)` is False for all of them. `.kind` and `.labels` proxy through,
    but anything reading `.parameters` or `.value` needs the target.
    """
    try:
        return obj.final_target if getattr(obj, "is_alias", False) else obj
    except Exception:
        return obj


def kind_of(obj) -> str:
    """class | method | property | attribute, matching the labels Sphinx renders."""
    kind = obj.kind.value if hasattr(obj.kind, "value") else str(obj.kind)
    labels = getattr(obj, "labels", None) or set()
    if kind == "attribute":
        return "property" if "property" in labels else "attribute"
    if kind == "function":
        # A @property is converted to an Attribute by griffe, so a function here is a method.
        return "property" if "property" in labels else "method"
    return kind


def docstring_text(obj) -> str:
    try:
        doc = getattr(obj, "docstring", None)
    except Exception:
        return ""
    return (doc.value or "") if doc else ""


def hash_comment(package: griffe.Module, obj) -> str | None:
    """Recover a `#:` attribute comment, which griffe 2.2.0 does not read at all.

    Only two files in the SDK use them (fold/fold.py, embeddings/embeddings.py, 20 total),
    but they are what the live page prints under each FoldAPI model attribute — dropping
    them loses documentation on two of the eleven pages.

    The source is already cached in `lines_collection` (store_source defaults True), so this
    costs no I/O. Stopping at the first non-`#:` line is load-bearing: embeddings.py has an
    ordinary `# added for static typing` comment directly above a block, and Sphinx does not
    absorb that one either.
    """
    target = deref(obj)
    path, lineno = getattr(target, "filepath", None), getattr(target, "lineno", None)
    if not path or not lineno:
        return None
    try:
        lines = package.lines_collection[path]
    except Exception:
        return None

    # Trailing form first: `attr: T  #: doc`. Unused by this SDK, but Sphinx supports it.
    own = lines[lineno - 1] if 0 < lineno <= len(lines) else ""
    if "#:" in own:
        trailing = own.split("#:", 1)[1].strip()
        if trailing:
            return trailing

    collected: list[str] = []
    index = lineno - 2
    while index >= 0:
        line = lines[index].strip()
        if not line.startswith("#:"):
            break
        collected.append(line[2:].lstrip())
        index -= 1
    return "\n".join(reversed(collected)) or None


def inherited_docstring_owner(cls, name: str):
    """The nearest ancestor member that actually carries a docstring, or None.

    Needed as well as the text: the docstring's *sections* have to be parsed from the object
    that owns it. Parsing the override instead leaves 21 inherited members
    (`wait`, `stream`, `get_item`, `get_metadata`) with prose but no parameter table.
    """
    try:
        chain = cls.mro()
    except Exception:
        return None
    for base in chain:
        try:
            member = base.members.get(name)
        except Exception:
            continue
        if member is None:
            continue
        if docstring_text(member).strip():
            return member
    return None


def inherited_docstring(cls, name: str) -> str:
    """autodoc_inherit_docstrings defaults True, so an override with no docstring of its own
    is still 'documented' via its base. 25 members across 13 of the 61 classes rely on this:
    neutralising this function drops the emitted member count from 439 to 414.

    `inherited_members` deliberately omits names the subclass overrides, so it cannot answer
    this — walk `mro()` instead, which griffe C3-linearises and which returns [] rather than
    raising for pydantic classes whose bases it cannot resolve.
    """
    try:
        chain = cls.mro()
    except Exception:
        return ""
    for base in chain:
        try:
            member = base.members.get(name)
        except Exception:
            continue
        if member is None:
            continue
        text = docstring_text(member)
        if text.strip():
            return text
    return ""


def alias_target(cls, obj):
    """`job_id = id` binds the sibling property object; griffe reports a bare attribute
    whose `value` is ExprName('id'). Resolve it so the type and docs come through.
    """
    target = deref(obj)
    value = getattr(target, "value", None)
    name = getattr(value, "name", None)
    if not name or not isinstance(name, str):
        return None
    try:
        chain = [cls, *cls.mro()]
    except Exception:
        chain = [cls]
    for holder in chain:
        try:
            sibling = holder.members.get(name)
        except Exception:
            continue
        if sibling is not None and sibling is not obj:
            return sibling
    return None
