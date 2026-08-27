"""Which members autodoc emitted, and what each one looks like.

The selection rule was derived by running candidate rules against scripts/pyapi/golden/ —
the 439 members the live Sphinx site actually rendered — not by reading sphinx's source and
hoping. Each clause below cites the case that forced it.
"""

from __future__ import annotations

import re

import griffe

from sdk import (
    alias_target,
    constant_value,
    deref,
    docstring_text,
    hash_comment,
    inherited_docstring,
    inherited_docstring_owner,
    kind_of,
)

META_PRIVATE = ":meta private:"

# `:py:meth:`~openprotein.molecules.Protein.mask_sequence_at``, `:py:class:`Protein``,
# `:meth:`get_as_complex`` — all three spellings occur, and a bare name is the common one.
ROLE = re.compile(r":(?:py:)?(?:class|meth|func|attr|obj|mod|exc|data):`~?([^`]+)`")


def rewrite_roles(text: str, owner: str | None, link=None) -> str:
    """Turn RST cross-reference roles into markdown links.

    Done here rather than in the renderer because only the generator knows which page
    documents what. A role that cannot be resolved becomes a plain code span, which is what
    Sphinx effectively rendered for the ones it could not resolve either.

    `link(target, owner)` returns `{"path", "page"}` or None.
    """
    if not text:
        return text

    def replace(match: re.Match[str]) -> str:
        target = match.group(1).strip()
        label = target.split(".")[-1]
        hit = link(target, owner) if link else None
        if not hit:
            return f"`{label}`"
        return f"[`{label}`](/python-api/api-reference/{hit['page']}#{hit['path']})"

    return ROLE.sub(replace, text)


def _type_text(annotation) -> str | None:
    if annotation is None:
        return None
    text = str(annotation).strip()
    return text or None


def type_parts(annotation, resolve=None) -> list[dict] | None:
    """Split a type annotation into tokens, each optionally carrying a link target.

    griffe hands back an expression tree rather than a string, and every `ExprName` in it
    exposes `canonical_path` resolved through the import graph — which is exactly what turns
    `Sequence[Complex | Protein | str | bytes] | MSAFuture` into four linkable names and the
    punctuation between them. Note the path an *annotation* resolves to is the one the
    annotating module imported (`openprotein.molecules.Complex`), while the same class read
    directly reports its defining module (`openprotein.molecules.complex.Complex`) — so the
    resolver has to accept both spellings.
    """
    if annotation is None or isinstance(annotation, str):
        text = _type_text(annotation)
        return [{"text": text}] if text else None

    parts: list[dict] = []
    try:
        tokens = list(annotation.iterate(flat=True))
    except Exception:
        text = _type_text(annotation)
        return [{"text": text}] if text else None

    for token in tokens:
        text = str(token)
        if not text:
            continue
        target = None
        canonical = None
        try:
            canonical = token.canonical_path
        except Exception:
            canonical = None
        if canonical and resolve is not None:
            target = resolve(canonical)
        # Merge runs of plain punctuation so the rendered output is not one span per bracket.
        if target is None and parts and parts[-1].get("path") is None:
            parts[-1]["text"] += text
        else:
            parts.append({"text": text, **target} if target else {"text": text})
    return parts or None


def signature_of(func, package=None) -> str:
    """Rebuild the call signature from griffe parameters.

    Not `str(func)` — that is not a signature. `self`/`cls` are dropped and a bare `*` is
    inserted before the first keyword-only parameter, which is what reproduces the live text
    (`fold(sequences, diffusion_samples=1, ..., **_)`).

    Annotations are deliberately absent — `autodoc_typehints = "description"` moved them into
    the parameter table. `package` enables constant folding; without it 25 signatures print
    `interval=config.POLLING_INTERVAL` instead of `interval=5`.
    """
    parts: list[str] = []
    star = False
    for param in getattr(func, "parameters", []) or []:
        name = param.name
        if name in {"self", "cls"}:
            continue
        kind = getattr(param.kind, "value", str(param.kind))
        if kind == "variadic positional":
            parts.append(f"*{name}")
            star = True
            continue
        if kind == "variadic keyword":
            parts.append(f"**{name}")
            continue
        if kind == "keyword-only" and not star:
            parts.append("*")
            star = True
        default = getattr(param, "default", None)
        if default is None:
            parts.append(name)
            continue
        folded = constant_value(package, default) if package is not None else None
        parts.append(f"{name}={folded or default}")
    return "(" + ", ".join(parts) + ")"


def _field_default(target) -> str | None:
    """The default a pydantic field declares, or None when required.

    A keyword-only `Field(...)` call is not a default; a positional first arg or `default=` is.
    """
    value = getattr(target, "value", None)
    if value is None:
        return None
    text = str(value).strip()
    if not re.match(r"^(pydantic\.)?Field\s*\(", text):
        return text
    inner = text[text.index("(") + 1 : text.rindex(")")].strip()
    if not inner:
        return None
    # Split on top-level commas only — a Field argument can itself contain one.
    depth = 0
    args: list[str] = []
    current = ""
    for char in inner:
        if char in "([{":
            depth += 1
        elif char in ")]}":
            depth -= 1
        if char == "," and depth == 0:
            args.append(current.strip())
            current = ""
            continue
        current += char
    if current.strip():
        args.append(current.strip())
    for arg in args:
        if arg.startswith("default="):
            return arg[len("default=") :].strip()
    first = args[0]
    if "=" in first.split("(")[0]:
        return None  # keyword-only call: the field is required
    return first


def _pydantic_chain(cls) -> list:
    """`cls` then its MRO, or [] if nothing in the chain derives from `BaseModel`.

    `cls.bases` alone misses `PromptJob(Job)`, which rendered `()`.
    """
    try:
        chain = [cls, *cls.mro()]
    except Exception:
        chain = [cls]
    for entry in chain:
        if any("BaseModel" in str(base) for base in (getattr(entry, "bases", None) or [])):
            return chain
    return []


def pydantic_signature(cls) -> str | None:
    """pydantic v2 defines `__init__` on BaseModel and only stamps `__signature__` on the
    subclass, so no `__init__` exists statically and `force_inspection=True` makes it worse
    (it returns pydantic machinery and loses the real fields).

    The live signature is reproducible from the annotation-only attributes in source order,
    all keyword-only: `ESMFold2Confidence(*, ptm, iptm, complex_plddt, ...)`. Fields are
    collected **base-first** so an inherited field keeps the position pydantic gives it, and
    a re-declaration (`PromptJob.job_type`) updates in place rather than appending.
    """
    chain = _pydantic_chain(cls)
    if not chain:
        return None
    fields: dict[str, str | None] = {}
    for holder in reversed(chain):
        for name, member in (getattr(holder, "members", None) or {}).items():
            if name.startswith("_") or kind_of(member) != "attribute":
                continue
            target = deref(member)
            if not _type_text(getattr(target, "annotation", None)):
                continue
            fields[name] = _field_default(target)
    if not fields:
        return None
    parts = [name if default is None else f"{name}={default}" for name, default in fields.items()]
    # `model_config = ConfigDict(extra="allow")` makes pydantic accept and expose arbitrary
    # extras, which it surfaces as a trailing `**extra_data` — `openprotein.jobs.Job` and
    # everything deriving from it.
    for holder in chain:
        config = (getattr(holder, "members", None) or {}).get("model_config")
        if config is None:
            continue
        if 'extra="allow"' in str(getattr(deref(config), "value", "")).replace("'", '"'):
            parts.append("**extra_data")
            break
    return "(*, " + ", ".join(parts) + ")"


def docstring_attributes(cls) -> dict[str, str]:
    """napoleon rewrites a class docstring's `Attributes` section into `.. attribute::`
    directives, which is why `FoldResultFuture.job` appears on the live page even though
    autodoc emits only 36 members for it. It is also where every pydantic field's
    description comes from.
    """
    out: dict[str, str] = {}
    try:
        sections = cls.docstring.parsed if cls.docstring else []
    except Exception:
        return out
    for section in sections:
        if getattr(section.kind, "value", str(section.kind)) != "attributes":
            continue
        for item in section.value:
            text = getattr(item, "description", "") or ""
            out[item.name] = text.strip()
    return out


def _candidates(cls, inherited: bool) -> dict[str, object]:
    """Own members first, then inherited ones if the directive asked for them.

    Bare `:inherited-members:` takes sphinx's default argument `'object'`, which filters
    only members that exist *solely* on `object` — so in practice everything griffe reports
    as inherited is a candidate.
    """
    out: dict[str, object] = dict(cls.members)
    if inherited:
        try:
            for name, member in (cls.inherited_members or {}).items():
                out.setdefault(name, member)
        except Exception:
            pass
    return out


def select(package, cls, options: dict) -> list[tuple[str, object, dict]]:
    """Reproduce autodoc's member set for one `.. autoclass::`.

    Returns (name, griffe object, extras) where extras carries the documentation this
    module had to recover itself.
    """
    inherited = "inherited-members" in options
    undoc = "undoc-members" in options
    raw_members = options.get("members")
    explicit = raw_members if isinstance(raw_members, list) else None
    excluded = set(options.get("exclude-members") or [])
    attr_docs = docstring_attributes(cls)

    chosen: list[tuple[str, object, dict]] = []
    for name, member in _candidates(cls, inherited).items():
        # No :special-members: anywhere in the corpus, and :undoc-members: does not rescue a
        # private name — only :private-members: would, which is also never used.
        if name.startswith("_"):
            continue
        if name in excluded:
            continue

        target = deref(member)
        kind = kind_of(member)

        own_doc = docstring_text(member)
        resolved = None
        # The object whose docstring `doc` came from — its sections are parsed from there.
        doc_owner = member if own_doc.strip() else None
        comment = hash_comment(package, member) if kind == "attribute" else None
        section_doc = attr_docs.get(name, "")
        # autodoc_inherit_docstrings defaults True.
        doc = own_doc or comment or section_doc
        if not doc.strip():
            ancestor = inherited_docstring_owner(cls, name)
            if ancestor is not None:
                doc = docstring_text(ancestor)
                doc_owner = ancestor

        # A bare assignment binds another object: `job_id = id`, `embeddings = embedding`,
        # `predict = generate`. The alias carries no docs, no type and no property-ness of
        # its own, so resolve it for every attribute — not only undocumented ones, since
        # `predict` is documented by its class docstring yet is a *method* on the live page.
        if kind == "attribute":
            sibling = alias_target(cls, member)
            if sibling is not None:
                resolved = sibling
                # The target outranks an MRO-inherited docstring; only the alias's own
                # outranks the target. At runtime `predict` IS `generate`, so autodoc read
                # `generate.__doc__` — deferring to the MRO got `ProteinModel.predict`'s
                # one-liner and lost the parameter table. The MRO walk still runs, on the
                # alias target: `SVDModel.id` shadows the documented `Future.id`.
                if not own_doc.strip():
                    sibling_doc = docstring_text(sibling)
                    if sibling_doc.strip():
                        doc, doc_owner = sibling_doc, sibling
                    else:
                        ancestor = inherited_docstring_owner(cls, sibling.name)
                        if ancestor is not None and docstring_text(ancestor).strip():
                            doc, doc_owner = docstring_text(ancestor), ancestor
                kind = kind_of(sibling)

        if META_PRIVATE in (own_doc or ""):
            continue

        # An explicit `:members: a, b, c` list still requires each name to be documented —
        # `openprotein.jobs.Future` lists `get`, which has no docstring and is not rendered.
        if explicit is not None:
            if name in explicit and doc.strip():
                chosen.append((name, member, {"doc": doc, "kind": kind, "resolved": resolved, "doc_owner": doc_owner}))
            continue

        # `self.x = ...` with no annotation and no `#:` is invisible to autodoc: it collects
        # dir(cls), own __annotations__ and the module analyzer's attribute comments, and an
        # unannotated instance attribute is in none of them. This is what drops FoldAPI.session.
        labels = getattr(member, "labels", None) or set()
        if (
            kind == "attribute"
            and labels == {"instance-attribute"}
            and not comment
            and not section_doc
            and not _type_text(getattr(target, "annotation", None))
        ):
            continue

        if not doc.strip() and not undoc:
            continue

        chosen.append(
            (name, member, {"doc": doc, "kind": kind, "resolved": resolved, "doc_owner": doc_owner})
        )

    # pydantic v2 puts `model_config` on BaseModel, so no subclass has it statically. Sphinx
    # rendered it on every pydantic class whose directive did not exclude it — which is why
    # five of the .rst entries carry `:exclude-members: model_config` and one forgot to.
    # Emitted for fidelity; add it to that class's exclude list in pages.json to hide it.
    if (
        pydantic_signature(cls) is not None
        and "model_config" not in excluded
        and explicit is None
        and "model_config" not in cls.members
    ):
        chosen.append(
            ("model_config", None, {"doc": None, "kind": "attribute", "synthetic": "pydantic"})
        )

    # Members the class docstring documents but that exist nowhere in the class body.
    # An explicit `:members:` list is exhaustive, so nothing is added past it.
    known = {name for name, _, _ in chosen}
    for name, text in attr_docs.items() if explicit is None else []:
        if name not in known and not name.startswith("_"):
            chosen.append((name, None, {"doc": text, "kind": "attribute", "from_docstring": True}))

    return _ordered(chosen, cls)


def _ordered(chosen, cls):
    """Own members in source order, then inherited and docstring-only ones by name.

    Deliberately NOT bit-compatible with autodoc's `bysource`. Sphinx's `sort_members` keys
    on `tagorder.get(name, len(tagorder))` — the dict's *size*, not max+1 — so inherited
    members tie with whichever own member happens to sit at that index and the two groups
    interleave. On `FoldResultFuture` that scatters 14 inherited members into the middle of
    the own ones. Reproducing that bug would make the page harder to read for no benefit;
    the diff harness reports order differences separately from set differences.
    """
    own = set(cls.members)

    def key(entry):
        name, member, extras = entry
        if extras.get("synthetic"):
            return (3, 0, name)
        if extras.get("from_docstring"):
            return (2, 0, name)
        if name not in own:
            return (1, 0, name)
        lineno = getattr(deref(member), "lineno", None) or 0
        return (0, lineno, name)

    return sorted(chosen, key=key)


def describe(package, cls, name, member, extras, resolve=None, link=None) -> dict:
    """One rendered member."""
    kind = extras["kind"]
    target = deref(member) if member is not None else None

    # `job_id = id` binds the sibling property object; selection already resolved it.
    sibling = extras.get("resolved")
    if sibling is not None:
        target = deref(sibling)
        # `predict = generate` is an attribute statically but a bound method at runtime, and
        # Sphinx labels it a method. Take the kind from whatever the name is actually bound to.
        kind = kind_of(sibling)

    owner = f"{cls.path}.{name}"
    out: dict = {
        "name": name,
        "kind": kind,
        "doc": rewrite_roles(extras["doc"], owner, link) if extras.get("doc") else None,
        "inherited_from": None,
        "inherited_from_ref": None,
        "source": None,
    }

    if target is None:
        if extras.get("synthetic"):
            out["synthetic"] = extras["synthetic"]
            # The live page rendered `model_config: ClassVar[ConfigDict] = {}`. There is no
            # object to read it off, so state it — otherwise the one synthetic member is the
            # only untyped attribute on the page.
            out["annotation"] = "ClassVar[ConfigDict]"
            out["annotation_parts"] = [{"text": "ClassVar[ConfigDict]"}]
            out["value"] = "{}"
        else:
            out["from_docstring"] = True
        return out

    if name not in cls.members:
        parent = getattr(target, "parent", None)
        defining = getattr(parent, "path", None)
        out["inherited_from"] = defining
        # The defining path (openprotein.jobs.futures.Future) is not the documented one
        # (openprotein.jobs.Future), so resolve it before offering it as a link.
        if defining and resolve is not None:
            out["inherited_from_ref"] = resolve(defining)

    if kind in {"method"}:
        out["signature"] = signature_of(target, package)
        out["returns"] = _type_text(getattr(target, "returns", None))
        out["returns_parts"] = type_parts(getattr(target, "returns", None), resolve)
        overloads = getattr(target, "overloads", None) or []
        if overloads:
            out["overloads"] = [signature_of(o, package) for o in overloads]
    else:
        out["annotation"] = _type_text(getattr(target, "annotation", None))
        out["annotation_parts"] = type_parts(getattr(target, "annotation", None), resolve)
        value = getattr(target, "value", None)
        out["value"] = str(value) if value is not None else None

    out["source"] = _source(target)
    # Sections come from whatever object owns the docstring — for an inherited member that is
    # an ancestor, not the override, which has no docstring of its own.
    out["parsed"] = _sections(extras.get("doc_owner") or target, resolve, owner, link)
    return out


def _source(target) -> dict | None:
    path = getattr(target, "filepath", None)
    lineno = getattr(target, "lineno", None)
    if not path or not lineno:
        # griffe's dataclasses extension synthesises __init__ with lineno 0.
        return None
    try:
        relative = str(target.relative_package_filepath)
    except Exception:
        return None
    return {"file": relative, "line": lineno, "end": getattr(target, "endlineno", None) or lineno}


SECTION_KINDS = {
    "text", "parameters", "other parameters", "returns",
    "raises", "attributes", "admonition", "examples",
}


_NUMPY_HEADER = (
    "Parameters",
    "Other Parameters",
    "Returns",
    "Yields",
    "Raises",
    "Warns",
    "Attributes",
    "Examples",
    "Notes",
    "See Also",
)


def _repair_underline(doc) -> None:
    """Rewrite a NumPy section underline typed with `_` instead of `-`.

    napoleon accepted it, griffe returns prose. One docstring (`predictor/predictor.py:289`);
    also filed in `UPSTREAM.md`.
    """
    text = getattr(doc, "value", None)
    if not text or "_" * 3 not in text:
        return
    lines = text.split("\n")
    changed = False
    for index in range(1, len(lines)):
        if not re.fullmatch(r"\s*_{3,}\s*", lines[index]):
            continue
        if lines[index - 1].strip() not in _NUMPY_HEADER:
            continue
        lines[index] = lines[index].replace("_", "-")
        changed = True
    if changed:
        doc.value = "\n".join(lines)


def parsed_sections(doc):
    """The richest parse, not whatever `auto` guessed.

    `Parser.auto` infers a style per docstring and gets it wrong for 13 of 495. The other 21 of
    the 34 recovered come from `sdk.inherited_docstring_owner`.
    """
    if doc is None:
        return []
    _repair_underline(doc)
    try:
        best = doc.parse(griffe.Parser.auto)
    except Exception:
        best = []
    if len(best) > 1:
        return best
    for parser in (griffe.Parser.numpy, griffe.Parser.google):
        try:
            candidate = doc.parse(parser)
        except Exception:
            continue
        if len(candidate) > len(best):
            best = candidate
    return best


def _sections(target, resolve=None, owner=None, link=None) -> list[dict]:
    """The 8 docstring section kinds this SDK actually uses, out of griffe's 18."""
    try:
        parsed = parsed_sections(getattr(target, "docstring", None))
    except Exception:
        return []
    out = []
    for section in parsed:
        kind = getattr(section.kind, "value", str(section.kind))
        if kind not in SECTION_KINDS:
            continue
        if kind == "text":
            out.append({"kind": "text", "text": rewrite_roles(section.value, owner, link)})
        elif kind in {"parameters", "other parameters", "raises", "attributes"}:
            out.append(
                {
                    "kind": kind,
                    "items": [
                        {
                            "name": getattr(item, "name", None),
                            "type": _type_text(getattr(item, "annotation", None)),
                            "type_parts": type_parts(getattr(item, "annotation", None), resolve),
                            "default": str(getattr(item, "default", "") or "") or None,
                            "text": rewrite_roles(
                                (getattr(item, "description", "") or "").strip(), owner, link
                            )
                            or None,
                        }
                        for item in section.value
                    ],
                }
            )
        elif kind == "returns":
            out.append(
                {
                    "kind": "returns",
                    "items": [
                        {
                            "name": getattr(item, "name", None) or None,
                            "type": _type_text(getattr(item, "annotation", None)),
                            "type_parts": type_parts(getattr(item, "annotation", None), resolve),
                            "text": rewrite_roles(
                                (getattr(item, "description", "") or "").strip(), owner, link
                            )
                            or None,
                        }
                        for item in section.value
                    ],
                }
            )
        elif kind == "admonition":
            out.append(
                {
                    "kind": "admonition",
                    "title": getattr(section, "title", None),
                    "text": rewrite_roles(
                        getattr(section.value, "description", str(section.value)), owner, link
                    ),
                }
            )
        elif kind == "examples":
            out.append({"kind": "examples", "items": [str(v[1]) for v in section.value]})
    return out
