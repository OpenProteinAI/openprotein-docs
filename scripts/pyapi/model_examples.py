"""Per-method examples for the base-model sections, derived from the pinned SDK's source.

The SDK is read as text, never imported. A model card advertises method paths such as
`batch/embeddings`; the verb that submits a path is found by following `self._run(verb, path)`
calls through the class's MRO. Snippets come from per-verb templates and per-class overrides
in `models-catalogue.json`, and every rendered block is verified against the same source.
"""

from __future__ import annotations

import ast
import fnmatch
from dataclasses import dataclass
from pathlib import Path
from typing import Any

SHARED_BASES = (
    "Model",
    "ProteinLanguageModel",
    "StructurePredictionModel",
    "StructureGenerativeModel",
)
FIT_VERBS = ("fit_svd", "fit_umap", "fit_gp")
ACCESSOR_PREFIX = "session.models."


class ExampleError(Exception):
    """A snippet or SDK shape the examples cannot be built or verified from."""


# ----------------------------------------------------------------------------- SDK source


@dataclass(frozen=True)
class SdkClass:
    name: str
    bases: tuple[str, ...]
    methods: dict[str, ast.FunctionDef]
    attributes: dict[str, ast.expr]
    fields: dict[str, bool]


class SdkClasses:
    """Every class under `openprotein/models`, with C3 linearisation by class name."""

    def __init__(self, classes: dict[str, SdkClass]):
        self.classes = classes
        self._mro: dict[str, tuple[str, ...]] = {}

    def mro(self, name: str) -> tuple[str, ...]:
        if name in self._mro:
            return self._mro[name]
        if name not in self.classes:
            raise ExampleError(f"the SDK models package has no class {name}")
        bases = [b for b in self.classes[name].bases if b in self.classes]
        sequences = [list(self.mro(b)) for b in bases] + [list(bases)]
        merged = [name]
        while any(sequences):
            sequences = [s for s in sequences if s]
            head = next(
                (
                    s[0]
                    for s in sequences
                    if not any(s[0] in other[1:] for other in sequences)
                ),
                None,
            )
            if head is None:
                raise ExampleError(f"{name} has no consistent method resolution order")
            merged.append(head)
            sequences = [s[1:] if s[0] == head else s for s in sequences]
        self._mro[name] = tuple(merged)
        return self._mro[name]

    def lookup(
        self, cls: str, member: str, start: int = 0
    ) -> tuple[int, SdkClass] | None:
        mro = self.mro(cls)
        for index in range(start, len(mro)):
            owner = self.classes[mro[index]]
            if member in owner.methods or member in owner.attributes:
                return index, owner
        return None


def _base_name(node: ast.expr) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        return node.attr
    return None


def parse_sdk_classes(sources: dict[str, str]) -> SdkClasses:
    """Classes from `{file name: source}`; a repeated class name is an error."""
    classes: dict[str, SdkClass] = {}
    for file, text in sources.items():
        for node in ast.parse(text).body:
            if not isinstance(node, ast.ClassDef):
                continue
            if node.name in classes:
                raise ExampleError(
                    f"{node.name} is defined twice in the SDK models package ({file})"
                )
            methods: dict[str, ast.FunctionDef] = {}
            attributes: dict[str, ast.expr] = {}
            fields: dict[str, bool] = {}
            for item in node.body:
                if isinstance(item, ast.FunctionDef):
                    methods.setdefault(item.name, item)
                elif isinstance(item, ast.Assign) and len(item.targets) == 1:
                    target = item.targets[0]
                    if isinstance(target, ast.Name):
                        attributes[target.id] = item.value
                elif isinstance(item, ast.AnnAssign) and isinstance(
                    item.target, ast.Name
                ):
                    fields[item.target.id] = item.value is None
                    if item.value is not None:
                        attributes[item.target.id] = item.value
            bases = tuple(b for b in map(_base_name, node.bases) if b)
            classes[node.name] = SdkClass(node.name, bases, methods, attributes, fields)
    return SdkClasses(classes)


def load_sdk_classes() -> SdkClasses:
    from importlib.metadata import distribution

    root = Path(
        str(distribution("openprotein-python").locate_file("openprotein/models"))
    )
    return parse_sdk_classes(
        {
            str(path.relative_to(root)): path.read_text(encoding="utf-8")
            for path in sorted(root.rglob("*.py"))
        }
    )


# ------------------------------------------------------------------- verbs and card paths


def _string_args(call: ast.Call) -> tuple[str, str] | None:
    if (
        len(call.args) >= 2
        and isinstance(call.args[0], ast.Constant)
        and isinstance(call.args[0].value, str)
        and isinstance(call.args[1], ast.Constant)
        and isinstance(call.args[1].value, str)
    ):
        return call.args[0].value, call.args[1].value
    return None


def _globs(
    sdk: SdkClasses, cls: str, member: str, start: int, seen: set[tuple[str, str]]
) -> set[str]:
    """Path globs a method submits through `_run`, following `super()` and `self` calls."""
    found = sdk.lookup(cls, member, start)
    if found is None or (found[1].name, member) in seen:
        return set()
    index, owner = found
    function = owner.methods.get(member)
    if function is None:
        return set()
    seen = seen | {(owner.name, member)}
    paths: set[str] = set()
    for call in (n for n in ast.walk(function) if isinstance(n, ast.Call)):
        func = call.func
        if not isinstance(func, ast.Attribute):
            continue
        if isinstance(func.value, ast.Name) and func.value.id == "self":
            if func.attr == "_run":
                args = _string_args(call)
                if args:
                    paths.add(args[1])
            else:
                paths |= _globs(sdk, cls, func.attr, 0, seen)
        elif (
            isinstance(func.value, ast.Call)
            and isinstance(func.value.func, ast.Name)
            and func.value.func.id == "super"
        ):
            paths |= _globs(sdk, cls, func.attr, index + 1, seen)
    return paths


def verb_globs(sdk: SdkClasses, cls: str) -> dict[str, set[str]]:
    """Public method -> the path globs it submits, for every method that submits one."""
    verbs: dict[str, set[str]] = {}
    for owner in sdk.mro(cls):
        for name in sdk.classes[owner].methods:
            if name.startswith("_") or name in verbs:
                continue
            globs = _globs(sdk, cls, name, 0, set())
            if globs:
                verbs[name] = globs
    return verbs


def verb_depth(sdk: SdkClasses, cls: str, verb: str) -> int:
    found = sdk.lookup(cls, verb)
    assert found is not None
    return found[0]


def map_paths(
    sdk: SdkClasses, cls: str, paths: list[str]
) -> tuple[dict[str, str], list[str]]:
    """Card path -> SDK verb (the most specific class's verb wins), and paths with no verb."""
    verbs = verb_globs(sdk, cls)
    mapped: dict[str, str] = {}
    unmapped: list[str] = []
    for path in paths:
        matching = [
            v
            for v, globs in verbs.items()
            if any(fnmatch.fnmatchcase(path, g) for g in globs)
        ]
        if not matching:
            unmapped.append(path)
            continue
        mapped[path] = min(matching, key=lambda v: (verb_depth(sdk, cls, v), v))
    return mapped, unmapped


def card_members(sdk: SdkClasses, cls: str, verbs: list[str]) -> list[str]:
    members = ["metadata", "methods", *dict.fromkeys(verbs)]
    if "ProteinLanguageModel" in sdk.mro(cls):
        members += list(FIT_VERBS)
    return members


def input_class(sdk: SdkClasses, cls: str) -> str | None:
    value = sdk.classes[cls].attributes.get("Input")
    return value.id if isinstance(value, ast.Name) else None


def default_checkpoint(sdk: SdkClasses, cls: str) -> str | None:
    found = sdk.lookup(cls, "_default_id")
    if found is None:
        return None
    value = found[1].attributes["_default_id"]
    return (
        value.value
        if isinstance(value, ast.Constant) and isinstance(value.value, str)
        else None
    )


# ------------------------------------------------------------------------------- rendering


def _lines(value: Any, where: str) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise ExampleError(f"{where} must be a list of code lines")
    return value


def example_entry(examples: dict, name: str) -> dict:
    """The per-class override for `name`, merged with any group that lists it."""
    sources = [examples.get("classes", {}).get(name, {})]
    sources += [g for g in examples.get("groups", []) if name in g.get("classes", [])]
    merged: dict = {}
    for source in sources:
        for key in ("setup", "verbs"):
            if key in source:
                if key in merged:
                    raise ExampleError(
                        f"{name} has {key} from more than one example entry"
                    )
                merged[key] = source[key]
    return merged


def example_class_names(examples: dict) -> set[str]:
    names = set(examples.get("classes", {}))
    for group in examples.get("groups", []):
        names |= set(group.get("classes", []))
    return names


def _owner_value(sdk: SdkClasses, cls: str, examples: dict, pick: Any) -> Any:
    for name in sdk.mro(cls):
        value = pick(example_entry(examples, name))
        if value is not None:
            return value
    return None


def verb_template(sdk: SdkClasses, cls: str, verb: str, examples: dict) -> list[str]:
    lines = _owner_value(sdk, cls, examples, lambda e: e.get("verbs", {}).get(verb))
    if lines is None:
        lines = examples.get("verbs", {}).get(verb)
    if lines is None:
        raise ExampleError(f"no example template for {cls}.{verb}")
    return _lines(lines, f"examples for {cls}.{verb}")


def class_setup(sdk: SdkClasses, cls: str, examples: dict) -> list[str]:
    setup = _owner_value(sdk, cls, examples, lambda e: e.get("setup"))
    return _lines(setup or [], f"setup for {cls}")


def render_block(accessor: str, setup: list[str], snippets: list[list[str]]) -> str:
    imports = [s for s in setup if s.startswith(("import ", "from "))]
    rest = [s for s in setup if s not in imports]
    parts: list[str] = []
    if imports:
        parts += [*imports, ""]
    parts.append(f"model = {ACCESSOR_PREFIX}{accessor}")
    parts += rest
    for lines in snippets:
        parts += ["", *lines]
    return "```python\n" + "\n".join(parts) + "\n```"


def render_examples(
    sdk: SdkClasses,
    cls: str,
    accessor: str,
    paths: list[str],
    examples: dict,
) -> tuple[str, dict[str, str], list[str]]:
    """The block for a class's advertised paths, the path -> verb map and unmapped paths."""
    mapped, unmapped = map_paths(sdk, cls, paths)
    snippets = [verb_template(sdk, cls, verb, examples) for verb in mapped.values()]
    if not snippets:
        return "", mapped, unmapped
    return (
        render_block(accessor, class_setup(sdk, cls, examples), snippets),
        mapped,
        unmapped,
    )


# ------------------------------------------------------------------------- verification


def _signature(function: ast.FunctionDef) -> tuple[list[str], set[str], set[str], bool]:
    """Positional names after self, all named parameters, required names, and `**` presence."""
    args = function.args
    positional = [a.arg for a in [*args.posonlyargs, *args.args]]
    if positional and positional[0] in ("self", "cls"):
        positional = positional[1:]
    defaults = len(args.defaults)
    required = set(positional[: len(positional) - defaults] if defaults else positional)
    names = set(positional)
    for arg, default in zip(args.kwonlyargs, args.kw_defaults):
        names.add(arg.arg)
        if default is None:
            required.add(arg.arg)
    return positional, names, required, args.kwarg is not None


def _check_call(
    call: ast.Call,
    positional: list[str],
    names: set[str],
    required: set[str],
    label: str,
) -> list[str]:
    if any(isinstance(arg, ast.Starred) for arg in call.args):
        return [f"{label} is called with * arguments"]
    errors: list[str] = []
    if len(call.args) > len(positional):
        errors.append(
            f"{label} takes {len(positional)} positional arguments, got {len(call.args)}"
        )
    supplied = set(positional[: len(call.args)])
    for keyword in call.keywords:
        if keyword.arg is None:
            errors.append(f"{label} is called with ** arguments")
        elif keyword.arg not in names:
            errors.append(f"{label} has no parameter {keyword.arg}")
        elif keyword.arg in supplied:
            errors.append(f"{label} gets {keyword.arg} twice")
        else:
            supplied.add(keyword.arg)
    missing = sorted(required - supplied)
    if missing:
        errors.append(f"{label} is missing {', '.join(missing)}")
    return errors


def verify_block(
    code: str,
    sdk: SdkClasses,
    accessors: dict[str, str],
    expected: dict[str, str] | None = None,
    *,
    expected_accessor: str | None = None,
) -> list[str]:
    """Problems with a rendered block; `accessors` maps accessor name -> returned class.

    `expected` maps advertised paths to Python verbs in example order.
    """
    body = code.strip()
    if body.startswith("```"):
        body = body.split("\n", 1)[1].rsplit("```", 1)[0]
    try:
        tree = ast.parse(body)
    except SyntaxError as error:
        return [f"does not parse: {error}"]
    errors: list[str] = []
    cls: str | None = None
    for node in tree.body:
        if (
            isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name)
            and node.targets[0].id == "model"
        ):
            value = node.value
            if not (
                isinstance(value, ast.Attribute)
                and isinstance(value.value, ast.Attribute)
                and isinstance(value.value.value, ast.Name)
                and value.value.value.id == "session"
                and value.value.attr == "models"
            ):
                return [f"model is not assigned from {ACCESSOR_PREFIX}<accessor>"]
            if value.attr not in accessors:
                return [f"ModelsAPI has no accessor {value.attr}"]
            if expected_accessor is not None and value.attr != expected_accessor:
                return [f"expected ModelsAPI.{expected_accessor}, got {value.attr}"]
            cls = accessors[value.attr]
    if cls is None:
        return [f"no `model = {ACCESSOR_PREFIX}<accessor>` assignment"]
    method_calls: list[tuple[int, int, str]] = []
    for call in (n for n in ast.walk(tree) if isinstance(n, ast.Call)):
        func = call.func
        if not (
            isinstance(func, ast.Attribute)
            and isinstance(func.value, ast.Name)
            and func.value.id == "model"
        ):
            continue
        label = f"model.{func.attr}"
        found = sdk.lookup(cls, func.attr)
        if found is None:
            errors.append(f"{cls} has no member {func.attr}")
            continue
        if func.attr in found[1].methods:
            positional, names, required, _ = _signature(found[1].methods[func.attr])
            errors += _check_call(
                call, positional, names, required, f"{cls}.{func.attr}"
            )
            method_calls.append((call.lineno, call.col_offset, func.attr))
        elif func.attr == "Input":
            target = input_class(sdk, cls)
            if target is None or target not in sdk.classes:
                errors.append(f"{cls}.Input is not a known input class")
                continue
            fields = sdk.classes[target].fields
            required = {name for name, needed in fields.items() if needed}
            errors += _check_call(call, [], set(fields), required, f"{cls}.Input")
        else:
            errors.append(f"{label} is not callable")
    if expected is not None:
        verbs = [verb for _, _, verb in sorted(method_calls)]
        wanted = list(expected.values())
        if verbs != wanted:
            errors.append(f"expected model calls {wanted}, got {verbs}")
    return errors
