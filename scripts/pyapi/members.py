"""Which members autodoc emitted, and what each one looks like.

The selection rule was derived by running candidate rules against scripts/pyapi/golden/ —
the 439 members the live Sphinx site actually rendered — not by reading sphinx's source and
hoping. Each clause below cites the case that forced it.
"""

from __future__ import annotations

from sdk import (
    alias_target,
    deref,
    docstring_text,
    hash_comment,
    inherited_docstring,
    kind_of,
)

META_PRIVATE = ":meta private:"


def _type_text(annotation) -> str | None:
    if annotation is None:
        return None
    text = str(annotation).strip()
    return text or None


def signature_of(func) -> str:
    """Rebuild the call signature from griffe parameters.

    Not `str(func)` — that is not a signature. `self`/`cls` are dropped and a bare `*` is
    inserted before the first keyword-only parameter, which is what reproduces the live text
    (`fold(sequences, diffusion_samples=1, ..., **_)`).
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
        parts.append(f"{name}={default}" if default is not None else name)
    return "(" + ", ".join(parts) + ")"


def pydantic_signature(cls) -> str | None:
    """pydantic v2 defines `__init__` on BaseModel and only stamps `__signature__` on the
    subclass, so no `__init__` exists statically and `force_inspection=True` makes it worse
    (it returns pydantic machinery and loses the real fields).

    The live signature is reproducible from the class's own annotation-only attributes in
    source order, all keyword-only: `ESMFold2Confidence(*, ptm, iptm, complex_plddt, ...)`.
    """
    if not any("BaseModel" in str(base) for base in (getattr(cls, "bases", None) or [])):
        return None
    fields = [
        name
        for name, member in cls.members.items()
        if not name.startswith("_")
        and kind_of(member) == "attribute"
        and _type_text(getattr(deref(member), "annotation", None))
    ]
    return "(*, " + ", ".join(fields) + ")" if fields else None


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
        comment = hash_comment(package, member) if kind == "attribute" else None
        section_doc = attr_docs.get(name, "")
        # autodoc_inherit_docstrings defaults True.
        doc = own_doc or comment or section_doc or inherited_docstring(cls, name)

        # A bare assignment binds another object: `job_id = id`, `embeddings = embedding`,
        # `predict = generate`. The alias carries no docs, no type and no property-ness of
        # its own, so resolve it for every attribute — not only undocumented ones, since
        # `predict` is documented by its class docstring yet is a *method* on the live page.
        if kind == "attribute":
            sibling = alias_target(cls, member)
            if sibling is not None:
                resolved = sibling
                # The sibling itself may be an undocumented override — `SVDModel.id` and
                # `EmbeddingsResultFuture.id` both shadow the documented `Future.id` — so the
                # MRO walk has to run on the alias target too, not just on the alias.
                doc = doc or docstring_text(sibling) or inherited_docstring(cls, sibling.name)
                kind = kind_of(sibling)

        if META_PRIVATE in (own_doc or ""):
            continue

        # An explicit `:members: a, b, c` list still requires each name to be documented —
        # `openprotein.jobs.Future` lists `get`, which has no docstring and is not rendered.
        if explicit is not None:
            if name in explicit and doc.strip():
                chosen.append((name, member, {"doc": doc, "kind": kind, "resolved": resolved}))
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

        chosen.append((name, member, {"doc": doc, "kind": kind, "resolved": resolved}))

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


def describe(package, cls, name, member, extras) -> dict:
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

    out: dict = {
        "name": name,
        "kind": kind,
        "doc": (extras["doc"] or None) if extras.get("doc") else None,
        "inherited_from": None,
        "source": None,
    }

    if target is None:
        if extras.get("synthetic"):
            out["synthetic"] = extras["synthetic"]
        else:
            out["from_docstring"] = True
        return out

    if name not in cls.members:
        parent = getattr(target, "parent", None)
        out["inherited_from"] = getattr(parent, "path", None)

    if kind in {"method"}:
        out["signature"] = signature_of(target)
        out["returns"] = _type_text(getattr(target, "returns", None))
        overloads = getattr(target, "overloads", None) or []
        if overloads:
            out["overloads"] = [signature_of(o) for o in overloads]
    else:
        out["annotation"] = _type_text(getattr(target, "annotation", None))
        value = getattr(target, "value", None)
        out["value"] = str(value) if value is not None else None

    out["source"] = _source(target)
    out["parsed"] = _sections(target)
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


def _sections(target) -> list[dict]:
    """The 8 docstring section kinds this SDK actually uses, out of griffe's 18."""
    try:
        parsed = target.docstring.parsed if target.docstring else []
    except Exception:
        return []
    out = []
    for section in parsed:
        kind = getattr(section.kind, "value", str(section.kind))
        if kind not in SECTION_KINDS:
            continue
        if kind == "text":
            out.append({"kind": "text", "text": section.value})
        elif kind in {"parameters", "other parameters", "raises", "attributes"}:
            out.append(
                {
                    "kind": kind,
                    "items": [
                        {
                            "name": getattr(item, "name", None),
                            "type": _type_text(getattr(item, "annotation", None)),
                            "default": str(getattr(item, "default", "") or "") or None,
                            "text": (getattr(item, "description", "") or "").strip() or None,
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
                            "text": (getattr(item, "description", "") or "").strip() or None,
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
                    "text": getattr(section.value, "description", str(section.value)),
                }
            )
        elif kind == "examples":
            out.append({"kind": "examples", "items": [str(v[1]) for v in section.value]})
    return out
