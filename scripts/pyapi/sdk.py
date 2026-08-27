"""Loading the SDK with griffe, and the five things griffe does not hand you directly.

Static analysis only — the SDK is never imported. Everything here was verified against the
live Sphinx output for openprotein-python 0.16.1; see README.md.
"""

from __future__ import annotations

import re
import shutil
import tempfile
from pathlib import Path

import griffe

PACKAGE = "openprotein"

# The public re-export path is what the .rst documents; griffe reports the defining module.
REPO = "https://github.com/OpenProteinAI/openprotein-python"

# `[source]` links resolve through this COMMIT, never the movable tag: the ~500 line ranges are
# only meaningful against one tree. Verified — tag v0.16.1 is object c1e67f31… pointing here, and
# all 51 line-linked files match it. `generate.py --verify-pin [--online]` re-checks.
SDK_COMMIT = "85dc94bd15a33bdc8674ad899571043016427ce3"
SDK_TAG_OBJECT = "c1e67f31f3dbbc3de07f39c77470da6ec2b852c5"


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
    """`job_id = id` binds the sibling property object. Resolve it for the type and docs.

    Start at the class that OWNS the assignment, not `cls`: `job_id = id` is written in
    `Future`'s body, and `EmbeddingsResultFuture` overrides `id` unannotated, so starting
    from `cls` finds that override and loses the `str`.
    """
    target = deref(obj)
    value = getattr(target, "value", None)
    name = getattr(value, "name", None)
    if not name or not isinstance(name, str):
        return None
    owner = getattr(target, "parent", None)
    chain = []
    for start in (owner, cls):
        if start is None or start in chain:
            continue
        chain.append(start)
        try:
            chain.extend(base for base in start.mro() if base not in chain)
        except Exception:
            pass
    for holder in chain:
        try:
            sibling = holder.members.get(name)
        except Exception:
            continue
        if sibling is not None and sibling is not obj:
            return sibling
    return None


def inherited_member(cls, name: str):
    """First `name` on `cls` or up its MRO, dereferenced.

    `autodoc_class_signature = "mixed"` introspects the runtime class, so an inherited
    `__init__` supplies the signature. `cls.members` alone gives `()` for 11 classes.
    """
    chain = [cls]
    try:
        chain.extend(cls.mro())
    except Exception:
        pass
    for holder in chain:
        try:
            member = holder.members.get(name)
        except Exception:
            continue
        if member is not None:
            return deref(member)
    return None


def inherited_annotation(cls, name: str):
    """First non-None annotation for `name` on `cls` or up its MRO."""
    chain = [cls]
    try:
        chain.extend(cls.mro())
    except Exception:
        pass
    for holder in chain:
        try:
            member = holder.members.get(name)
        except Exception:
            continue
        if member is None:
            continue
        annotation = getattr(deref(member), "annotation", None)
        if annotation is not None:
            return annotation
    return None


def constant_value(package, expr):
    """The literal a module-level constant stands for, or None.

    griffe reports the default as written (`config.POLLING_INTERVAL`); Sphinx printed `5`.
    25 signatures. Module-level plain literals only — enum members are left alone.
    """
    path = getattr(expr, "canonical_path", None)
    if not path or not isinstance(path, str):
        return None
    root = getattr(package, "path", None)
    if not root or not (path == root or path.startswith(root + ".")):
        return None
    node = package
    for part in path[len(root) + 1 :].split("."):
        try:
            node = deref(node.members[part])
        except Exception:
            return None
    # Enum members resolve the same way but Sphinx printed the member, not its value.
    parent = getattr(node, "parent", None)
    if getattr(getattr(parent, "kind", None), "value", None) != "module":
        return None
    value = getattr(node, "value", None)
    if value is None:
        return None
    text = str(value)
    # A literal, not another name: digits, a quoted string, a bool or None.
    if re.fullmatch(r"-?\d+(\.\d+)?|True|False|None|'[^']*'|\"[^\"]*\"", text):
        return text
    return None
