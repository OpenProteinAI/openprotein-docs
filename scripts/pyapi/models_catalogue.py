"""The base-model sections of the `models` reference page, built from committed fixtures.

    python3 scripts/pyapi/models_catalogue.py            # rewrite the derived fixtures and pages.json
    python3 scripts/pyapi/models_catalogue.py --check    # fail if either differs from a regeneration
    python3 scripts/pyapi/models_catalogue.py --refresh  # fetch the listing, write the snapshot, regenerate
    python3 scripts/pyapi/models_catalogue.py --report   # fetch the listing, print drift, write nothing

Inputs: the snapshot fixtures (`models-relevance-source.json`, `models-descriptions.json`,
`models-methods.json`), the pinned SDK's models package read as source text, and
`models-catalogue.json` (the curation: prose, example inputs, exclusions).
Only `--refresh` and `--report` touch the network: one GET of the models listing from
`OP_SERVER_PROXY` in `.env` (`pnpm update:pyapi` loads it).
"""

from __future__ import annotations

import argparse
import ast
import difflib
import fnmatch
import http.client
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from collections.abc import Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

import model_examples

HERE = Path(__file__).resolve().parent
PAGES = HERE / "pages.json"
CURATION = HERE / "models-catalogue.json"
FIXTURES = HERE / "tests" / "fixtures"
SOURCE_FIXTURE = FIXTURES / "models-relevance-source.json"
DESCRIPTIONS_FIXTURE = FIXTURES / "models-descriptions.json"
RELEVANCE_FIXTURE = FIXTURES / "models-relevance-order.json"
BASE_ORDER_FIXTURE = FIXTURES / "models-base-order.json"
METHODS_FIXTURE = FIXTURES / "models-methods.json"

PROXY_ENV = "OP_SERVER_PROXY"
LISTING_PATH = "/api/v1/models?scope=system&verbose=true&sort_by=relevance"
TIMEOUT_ENV = "OP_MODELS_TIMEOUT"
DEFAULT_TIMEOUT_SECONDS = 30.0

DESCRIPTION_FIELDS = ("summary", "citation_title", "doi", "github")
MODELS_HEADING = "Models"
TRAINABLE_HEADING = "**Trainable models**"
INTERFACE_TARGET = "#openprotein.models."
ACCESSOR_TARGET = "#openprotein.models.ModelsAPI."


class CatalogueError(Exception):
    """Input that cannot produce the sections; nothing is written."""


class FetchError(CatalogueError):
    pass


# ----------------------------------------------------------------------------- SDK source


@dataclass(frozen=True)
class Accessor:
    name: str
    model_id: str
    interface: str
    alias_of: str | None


@dataclass(frozen=True)
class SdkModels:
    accessors: tuple[Accessor, ...]
    trainable: tuple[tuple[str, str], ...]

    @property
    def model_ids(self) -> set[str]:
        return {a.model_id for a in self.accessors}


def parse_sdk_models(source: str) -> SdkModels:
    """`ModelsAPI` properties read from source: model ids, accessor names, aliases, interfaces."""
    api = next(
        (
            node
            for node in ast.parse(source).body
            if isinstance(node, ast.ClassDef) and node.name == "ModelsAPI"
        ),
        None,
    )
    if api is None:
        raise CatalogueError("the SDK models module has no ModelsAPI class")
    handles: dict[str, tuple[str, str]] = {}
    aliases: dict[str, str] = {}
    trainable: list[tuple[str, str]] = []
    for node in api.body:
        if not isinstance(node, ast.FunctionDef) or not node.decorator_list:
            continue
        decorator = node.decorator_list[0]
        if not isinstance(decorator, ast.Name) or decorator.id not in {
            "property",
            "cached_property",
        }:
            continue
        returned = next(
            (item.value for item in node.body if isinstance(item, ast.Return)), None
        )
        where = f"ModelsAPI.{node.name}"
        if returned is None:
            raise CatalogueError(f"{where} returns nothing")
        if decorator.id == "cached_property":
            if not (
                isinstance(returned, ast.Call)
                and isinstance(returned.func, ast.Attribute)
                and returned.func.attr == "_bind"
                and isinstance(returned.func.value, ast.Attribute)
            ):
                raise CatalogueError(f"{where} is not an estimators._bind(...) factory")
            trainable.append((node.name, returned.func.value.attr))
        elif isinstance(returned, ast.Call):
            if not (
                isinstance(returned.func, ast.Attribute)
                and returned.func.attr == "_handle"
                and len(returned.args) >= 2
                and isinstance(returned.args[0], ast.Constant)
                and isinstance(returned.args[0].value, str)
                and isinstance(returned.args[1], ast.Name)
            ):
                raise CatalogueError(f"{where} is not self._handle('<id>', <Class>)")
            handles[node.name] = (returned.args[0].value, returned.args[1].id)
        elif (
            isinstance(returned, ast.Attribute)
            and isinstance(returned.value, ast.Name)
            and returned.value.id == "self"
        ):
            aliases[node.name] = returned.attr
        else:
            raise CatalogueError(f"{where} returns an unrecognised expression")
    accessors = [
        Accessor(name, model_id, interface, None)
        for name, (model_id, interface) in handles.items()
    ]
    for name, target in aliases.items():
        if target not in handles:
            raise CatalogueError(f"ModelsAPI.{name} aliases unknown accessor {target}")
        model_id, interface = handles[target]
        accessors.append(Accessor(name, model_id, interface, target))
    by_id: dict[str, str] = {}
    for a in accessors:
        if by_id.setdefault(a.model_id, a.interface) != a.interface:
            raise CatalogueError(f"{a.model_id} is bound to two interface classes")
    return SdkModels(tuple(accessors), tuple(trainable))


def load_sdk_models() -> SdkModels:
    """The pinned SDK's models module, located without importing it."""
    from importlib.metadata import distribution

    path = distribution("openprotein-python").locate_file(
        "openprotein/models/models.py"
    )
    return parse_sdk_models(Path(str(path)).read_text(encoding="utf-8"))


# ------------------------------------------------------------------------------- fetching


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args: Any, **kwargs: Any) -> None:
        return None


CERT_HINT = "set SSL_CERT_FILE to your CA bundle"


def tls_context() -> ssl.SSLContext:
    """A verifying context: the environment's CA paths, else certifi's bundle, else the default."""
    if os.environ.get("SSL_CERT_FILE") or os.environ.get("SSL_CERT_DIR"):
        return ssl.create_default_context()
    try:
        import certifi
    except ImportError:
        return ssl.create_default_context()
    return ssl.create_default_context(cafile=certifi.where())


def fetch_json(url: str, timeout: float) -> Any:
    """GET `url` and parse the body. No credentials, cookies, proxies or redirects."""
    if urlsplit(url).scheme not in ("http", "https"):
        raise FetchError(f"{url}: only http and https URLs are fetched")
    opener = urllib.request.build_opener(
        urllib.request.ProxyHandler({}),
        urllib.request.HTTPSHandler(context=tls_context()),
        _NoRedirect,
    )
    request = urllib.request.Request(
        url,
        method="GET",
        headers={
            "Accept": "application/json",
            "User-Agent": "openprotein-docs-catalogue",
        },
    )
    try:
        with opener.open(request, timeout=timeout) as response:
            if response.status != 200:
                raise FetchError(f"{url} -> HTTP {response.status}")
            body = response.read()
    except urllib.error.HTTPError as error:
        raise FetchError(f"{url} -> HTTP {error.code}") from error
    except (urllib.error.URLError, http.client.HTTPException, OSError) as error:
        reason = getattr(error, "reason", error)
        hint = (
            f"\n{CERT_HINT}" if isinstance(reason, ssl.SSLCertVerificationError) else ""
        )
        raise FetchError(f"{url}: {error}{hint}") from error
    try:
        return json.loads(body)
    except ValueError as error:
        raise FetchError(f"{url}: malformed JSON ({error})") from error


def fetch_listings(env: Mapping[str, str] | None = None) -> tuple[Any, Any]:
    env = os.environ if env is None else env
    raw = env.get(TIMEOUT_ENV)
    try:
        timeout = float(raw) if raw else DEFAULT_TIMEOUT_SECONDS
    except ValueError:
        raise CatalogueError(f"{TIMEOUT_ENV} must be a number of seconds, not {raw!r}")
    if timeout <= 0:
        raise CatalogueError(f"{TIMEOUT_ENV} must be positive")
    origin = (env.get(PROXY_ENV) or "").rstrip("/")
    if not origin:
        raise CatalogueError(f"set {PROXY_ENV} in .env")
    # One listing supplies the order and the descriptions alike.
    listing = fetch_json(origin + LISTING_PATH, timeout)
    return listing, listing


# ------------------------------------------------------------------------------ deriving


def is_excluded(model_id: str, patterns: list[str]) -> bool:
    return any(fnmatch.fnmatchcase(model_id, p) for p in patterns)


def _listing(value: Any, what: str) -> list[dict]:
    if not isinstance(value, list) or not all(isinstance(m, dict) for m in value):
        raise CatalogueError(f"the {what} listing is not a JSON array of objects")
    return value


def trim_order(listing: Any) -> list[dict[str, str]]:
    """The order listing reduced to what the sections read: id, base model, display name."""
    trimmed = []
    for entry in _listing(listing, "order"):
        item = {}
        for key in ("model_id", "model", "name"):
            if not isinstance(entry.get(key), str) or not entry[key]:
                raise CatalogueError(
                    f"order listing entry without a string {key}: {entry!r:.120}"
                )
            item[key] = entry[key]
        trimmed.append(item)
    ids = [m["model_id"] for m in trimmed]
    if len(set(ids)) != len(ids):
        raise CatalogueError("the order listing repeats a model_id")
    return trimmed


def trim_descriptions(listing: Any, ids: set[str]) -> dict[str, dict[str, str | None]]:
    """model_id -> the four description fields, for the listed public models in `ids`."""
    found: dict[str, dict[str, str | None]] = {}
    for entry in _listing(listing, "descriptions"):
        model_id = entry.get("model_id")
        if not isinstance(model_id, str):
            raise CatalogueError(
                f"descriptions listing entry without a model_id: {entry!r:.120}"
            )
        if model_id not in ids:
            continue
        description = entry.get("description")
        if not isinstance(description, dict):
            continue
        for key in DESCRIPTION_FIELDS:
            if description.get(key) is not None and not isinstance(
                description[key], str
            ):
                raise CatalogueError(f"{model_id}: description.{key} is not a string")
        found[model_id] = {key: description.get(key) for key in DESCRIPTION_FIELDS}
    return found


def trim_methods(
    descriptions_listing: Any, order_listing: Any, ids: list[str]
) -> dict[str, list[str]]:
    """model_id -> advertised method paths: the public card's, else the order listing's."""
    cards: dict[str, tuple[dict, str]] = {}
    for listing, what in (
        (order_listing, "order"),
        (descriptions_listing, "descriptions"),
    ):
        for entry in _listing(listing, what):
            model_id = entry.get("model_id")
            if model_id in ids:
                cards[model_id] = (entry, what)
    missing = [i for i in ids if i not in cards]
    if missing:
        raise CatalogueError("no method paths for: " + ", ".join(missing))

    paths: dict[str, list[str]] = {}
    for model_id in ids:
        entry, what = cards[model_id]
        methods = entry.get("methods")
        if not isinstance(methods, list) or not all(
            isinstance(m, dict) and isinstance(m.get("path"), str) for m in methods
        ):
            raise CatalogueError(f"{model_id}: the {what} listing has no method paths")
        paths[model_id] = [m["path"] for m in methods]
    return paths


@dataclass(frozen=True)
class Derived:
    relevance_order: list[str]
    base_order: list[dict]
    skipped: list[str]
    excluded: list[str]


def derive_orders(
    source: list[dict[str, str]], sdk: SdkModels, excluded: list[str]
) -> Derived:
    """Relevance order and base-model grouping of the SDK's models, from the order listing."""
    kept = [m for m in source if not is_excluded(m["model_id"], excluded)]
    listed = {m["model_id"] for m in kept}
    missing = sorted(i for i in sdk.model_ids - listed if not is_excluded(i, excluded))
    if missing:
        raise CatalogueError(
            "SDK models absent from the order listing: " + ", ".join(missing)
        )
    supported = [m for m in kept if m["model_id"] in sdk.model_ids]
    bases: dict[str, list[str]] = {}
    for m in supported:
        bases.setdefault(m["model"], []).append(m["model_id"])
    return Derived(
        relevance_order=[m["model_id"] for m in supported],
        base_order=[{"model": k, "models": v} for k, v in bases.items()],
        skipped=[m["model_id"] for m in kept if m["model_id"] not in sdk.model_ids],
        excluded=[
            m["model_id"] for m in source if is_excluded(m["model_id"], excluded)
        ],
    )


# ------------------------------------------------------------------------------ rendering


def citation(d: dict) -> str:
    parts = []
    if d.get("citation_title"):
        title = (
            f"[{d['citation_title']}]({d['doi']})"
            if d.get("doi")
            else d["citation_title"]
        )
        parts.append(f"*{title}*")
    if d.get("github"):
        parts.append(f"[GitHub]({d['github']})")
    return " · ".join(parts)


def _variant_notes(base: dict, variants: list[tuple[str, dict]]) -> list[str]:
    """One paragraph per distinct (note, citation); variants sharing both are named together."""
    base_paragraphs = set((base.get("summary") or "").split("\n\n"))
    groups: list[tuple[tuple[str, str], list[str]]] = []
    for name, variant in variants:
        paragraphs = (variant.get("summary") or "").split("\n\n")
        extra = (
            [p for p in paragraphs if p not in base_paragraphs]
            if any(p in base_paragraphs for p in paragraphs)
            else paragraphs
        )
        note = "\n\n".join(p for p in extra if p)
        cite = citation(variant) if citation(variant) != citation(base) else ""
        key = (note, cite)
        for existing_key, names in groups:
            if existing_key == key:
                names.append(name)
                break
        else:
            groups.append((key, [name]))
    notes = []
    for (note, cite), names in groups:
        body = " ".join(x for x in (note, cite) if x)
        if body:
            notes.append(f"**{', '.join(names)}.** {body}")
    return notes


def accessor_cell(accessor: Accessor) -> str:
    cell = f"[`{accessor.name}`]({ACCESSOR_TARGET}{accessor.name})"
    return cell + (f" (alias of `{accessor.alias_of}`)" if accessor.alias_of else "")


def model_row(model_id: str, sdk: SdkModels) -> str:
    rows = sorted(
        (a for a in sdk.accessors if a.model_id == model_id), key=lambda a: a.name
    )
    interface = rows[0].interface
    return (
        f"| `{model_id}` | {', '.join(accessor_cell(a) for a in rows)} "
        f"| [`{interface}`]({INTERFACE_TARGET}{interface}) |"
    )


def models_table(ids: list[str], sdk: SdkModels) -> str:
    return "\n".join(
        ["| Model ID | Accessors | Interface |", "| --- | --- | --- |"]
        + [model_row(i, sdk) for i in ids]
    )


def trainable_table(sdk: SdkModels) -> str:
    rows = [
        f"| [`{name}`]({ACCESSOR_TARGET}{name}) | [`{interface}`]({INTERFACE_TARGET}{interface}) |"
        for name, interface in sorted(sdk.trainable)
    ]
    return "\n".join(["| Accessors | Interface |", "| --- | --- |", *rows])


def render_models_prose(curation: dict, sdk: SdkModels) -> str:
    return f"{curation['intro']}\n\n{TRAINABLE_HEADING}\n\n{trainable_table(sdk)}"


def default_accessor(sdk: SdkModels, model_id: str) -> str:
    """The shortest accessor name of a model, which is its friendliest alias."""
    return min(
        (a.name for a in sdk.accessors if a.model_id == model_id),
        key=lambda n: (len(n), n),
    )


def owned_classes(base_order: list[dict], sdk: SdkModels) -> dict[str, list[str]]:
    """Base model -> the classes only it uses, excluding the shared interface classes."""
    interface = {a.model_id: a.interface for a in sdk.accessors}
    used: dict[str, list[str]] = {}
    for base in base_order:
        names = list(dict.fromkeys(interface[i] for i in base["models"]))
        used[base["model"]] = names
    counts: dict[str, int] = {}
    for names in used.values():
        for name in names:
            counts[name] = counts.get(name, 0) + 1
    return {
        model: [
            n for n in names if counts[n] == 1 and n not in model_examples.SHARED_BASES
        ]
        for model, names in used.items()
    }


@dataclass(frozen=True)
class SdkSource:
    """The pinned SDK as the examples read it: classes by name, and each model's card paths."""

    classes: model_examples.SdkClasses
    methods: dict[str, list[str]]


def interface_of(sdk: SdkModels, model_id: str) -> str:
    return next(a.interface for a in sdk.accessors if a.model_id == model_id)


def base_examples(
    base: dict, sdk: SdkModels, source: SdkSource, examples: dict
) -> tuple[str, dict[str, str], list[str]]:
    """The base model's example block, its path -> verb map and the paths with no verb."""
    ids = base["models"]
    default = ids[0]
    paths = source.methods[default]
    different = [i for i in ids[1:] if source.methods[i] != paths]
    if different:
        raise CatalogueError(
            f"{base['model']}: {', '.join(different)} advertise different methods from {default}"
        )
    cls = interface_of(sdk, default)
    if any(interface_of(sdk, i) != cls for i in ids):
        raise CatalogueError(f"{base['model']} mixes interface classes")
    try:
        block, mapped, unmapped = model_examples.render_examples(
            source.classes, cls, default_accessor(sdk, default), paths, examples
        )
    except model_examples.ExampleError as error:
        raise CatalogueError(f"{base['model']}: {error}") from error
    if block:
        problems = model_examples.verify_block(
            block,
            source.classes,
            {a.name: a.interface for a in sdk.accessors},
            mapped,
            expected_accessor=default_accessor(sdk, default),
        )
        if problems:
            raise CatalogueError(f"{base['model']} examples: " + "; ".join(problems))
    return block, mapped, unmapped


def owned_cards(
    base: dict,
    owned: list[str],
    sdk: SdkModels,
    source: SdkSource,
) -> list[dict]:
    """An autoclass card per owned class, and its input class beside it."""
    cards: list[dict] = []
    for cls in owned:
        advertised = source.methods[
            next(i for i in base["models"] if interface_of(sdk, i) == cls)
        ]
        mapped, _ = model_examples.map_paths(source.classes, cls, advertised)
        members = model_examples.card_members(
            source.classes, cls, [mapped[p] for p in advertised if p in mapped]
        )
        cards.append(
            {
                "directive": "autoclass",
                "target": f"openprotein.models.{cls}",
                "options": {"members": members, "inherited-members": True},
            }
        )
        input_class = model_examples.input_class(source.classes, cls)
        if input_class:
            cards.append(
                {
                    "directive": "autoclass",
                    "target": f"openprotein.models.{input_class}",
                    "options": {"members": True},
                }
            )
    return cards


def render_base_section(
    base: dict,
    names: dict[str, str],
    descriptions: dict[str, dict],
    curated: dict,
    sdk: SdkModels,
    source: SdkSource,
    examples: dict,
    owned: list[str],
) -> dict:
    ids = base["models"]
    parts: list[str] = []
    described = descriptions.get(ids[0])
    if described is not None:
        if described.get("summary"):
            parts.append(described["summary"])
        if citation(described):
            parts.append(citation(described))
        parts += _variant_notes(
            described,
            [(names[v], descriptions[v]) for v in ids[1:] if v in descriptions],
        )
    if curated.get("usage"):
        parts.append(curated["usage"])
    parts.append(models_table(ids, sdk))
    block, _, unmapped = base_examples(base, sdk, source, examples)
    if unmapped:
        print(
            f"  {base['model']}: no SDK verb for {', '.join(unmapped)}",
            file=sys.stderr,
        )
    if block:
        parts.append(block)
    return {
        "heading": base["model"],
        "level": 3,
        "nested": True,
        "prose": "\n\n".join(parts),
        "entries": owned_cards(base, owned, sdk, source),
        "autosummary": [],
    }


def render_sections(
    source: list[dict[str, str]],
    descriptions: dict[str, dict],
    derived: Derived,
    curation: dict,
    sdk: SdkModels,
    sdk_source: SdkSource,
) -> tuple[str, list[dict]]:
    """The Models section's prose and the base-model sections that follow it."""
    bases = {b["model"] for b in derived.base_order}
    orphans = sorted(set(curation["models"]) - bases)
    if orphans:
        raise CatalogueError(
            "curation names base models the listing and SDK do not produce: "
            + ", ".join(orphans)
        )
    stray = sorted(set(descriptions) - set(derived.relevance_order))
    if stray:
        raise CatalogueError(
            "descriptions for models outside the catalogue: " + ", ".join(stray)
        )
    names = {m["model_id"]: m["name"] for m in source}
    owned = owned_classes(derived.base_order, sdk)
    sections = [
        render_base_section(
            b,
            names,
            descriptions,
            curation["models"].get(b["model"], {}),
            sdk,
            sdk_source,
            curation["examples"],
            owned[b["model"]],
        )
        for b in derived.base_order
    ]
    return render_models_prose(curation, sdk), sections


def apply_to_pages(pages: dict, models_prose: str, sections: list[dict]) -> dict:
    """Replace the Models prose and the nested base-model sections that follow it."""
    page = next((p for p in pages["pages"] if p["page"] == "models"), None)
    held = page["sections"] if page else []
    start = next(
        (i for i, s in enumerate(held) if s["heading"] == MODELS_HEADING), None
    )
    if start is None:
        raise CatalogueError("pages.json has no Models section on the models page")
    end = start + 1
    while end < len(held) and held[end].get("nested"):
        end += 1
    held[start]["prose"] = models_prose
    held[start + 1 : end] = sections
    return pages


# --------------------------------------------------------------------------------- files


def dumps(value: Any) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


@dataclass(frozen=True)
class Outputs:
    """Every file the catalogue owns, as text keyed by path."""

    files: dict[Path, str]


def build_outputs(
    source: list[dict[str, str]],
    descriptions: dict[str, dict],
    methods: dict[str, list[str]],
    sdk: SdkModels,
    classes: model_examples.SdkClasses,
    curation: dict,
    pages_text: str,
) -> Outputs:
    derived = derive_orders(source, sdk, curation["excludedIds"])
    models_prose, sections = render_sections(
        source, descriptions, derived, curation, sdk, SdkSource(classes, methods)
    )
    pages = apply_to_pages(json.loads(pages_text), models_prose, sections)
    return Outputs(
        {
            SOURCE_FIXTURE: dumps(source),
            DESCRIPTIONS_FIXTURE: dumps(descriptions),
            METHODS_FIXTURE: dumps(methods),
            RELEVANCE_FIXTURE: dumps(derived.relevance_order),
            BASE_ORDER_FIXTURE: dumps(derived.base_order),
            PAGES: dumps(pages),
        }
    )


def load_curation() -> dict:
    curation = read_json(CURATION)
    for key in ("intro", "excludedIds", "models", "examples"):
        if key not in curation:
            raise CatalogueError(f"{CURATION.name} has no {key}")
    cards = sorted(m for m, c in curation["models"].items() if "cards" in c)
    if cards:
        raise CatalogueError(
            f"{CURATION.name} lists class cards for {', '.join(cards)}; they are derived from the SDK"
        )
    return curation


def offline_outputs() -> Outputs:
    return build_outputs(
        read_json(SOURCE_FIXTURE),
        read_json(DESCRIPTIONS_FIXTURE),
        read_json(METHODS_FIXTURE),
        load_sdk_models(),
        model_examples.load_sdk_classes(),
        load_curation(),
        PAGES.read_text(encoding="utf-8"),
    )


def stale_files(outputs: Outputs) -> list[Path]:
    return [
        p
        for p, text in outputs.files.items()
        if not p.exists() or p.read_text(encoding="utf-8") != text
    ]


def write_files(outputs: Outputs) -> list[Path]:
    changed = stale_files(outputs)
    for path in changed:
        path.write_text(outputs.files[path], encoding="utf-8")
    return changed


# ---------------------------------------------------------------------------------- drift


def _by_id(rows: list[dict]) -> dict[str, dict]:
    return {r["model_id"]: r for r in rows}


def drift_lines(committed: dict[str, Any], fresh: dict[str, Any]) -> list[str]:
    """Human-readable differences between two snapshots (source, descriptions, orders)."""
    lines: list[str] = []
    old_src, new_src = _by_id(committed["source"]), _by_id(fresh["source"])
    for model_id in new_src.keys() - old_src.keys():
        lines.append(f"order listing: added {model_id} ({new_src[model_id]['model']})")
    for model_id in old_src.keys() - new_src.keys():
        lines.append(f"order listing: removed {model_id}")
    for model_id in old_src.keys() & new_src.keys():
        for key in ("model", "name"):
            if old_src[model_id][key] != new_src[model_id][key]:
                lines.append(
                    f"order listing: {model_id} {key} {old_src[model_id][key]!r} -> {new_src[model_id][key]!r}"
                )
    old_ids, new_ids = (
        [m["model_id"] for m in committed["source"]],
        [m["model_id"] for m in fresh["source"]],
    )
    if set(old_ids) == set(new_ids) and old_ids != new_ids:
        lines.append("order listing: same models, different order")
    old_d, new_d = committed["descriptions"], fresh["descriptions"]
    for model_id in new_d.keys() - old_d.keys():
        lines.append(f"descriptions: added {model_id}")
    for model_id in old_d.keys() - new_d.keys():
        lines.append(f"descriptions: removed {model_id}")
    for model_id in old_d.keys() & new_d.keys():
        for key in DESCRIPTION_FIELDS:
            if old_d[model_id].get(key) != new_d[model_id].get(key):
                lines.append(f"descriptions: {model_id} {key} changed")
    old_m, new_m = committed["methods"], fresh["methods"]
    for model_id in new_m.keys() - old_m.keys():
        lines.append(f"methods: added {model_id}")
    for model_id in old_m.keys() - new_m.keys():
        lines.append(f"methods: removed {model_id}")
    for model_id in old_m.keys() & new_m.keys():
        if old_m[model_id] != new_m[model_id]:
            lines.append(
                f"methods: {model_id} paths {old_m[model_id]} -> {new_m[model_id]}"
            )
    for name in ("relevance_order", "base_order"):
        if committed[name] != fresh[name]:
            old_text, new_text = (
                dumps(committed[name]).splitlines(),
                dumps(fresh[name]).splitlines(),
            )
            lines.append(f"{name}: changed")
            lines += [
                "    " + line
                for line in difflib.unified_diff(
                    old_text, new_text, "committed", "fetched", n=0, lineterm=""
                )
            ]
    return lines


def fetched_snapshot(
    order_listing: Any, descriptions_listing: Any, sdk: SdkModels, curation: dict
) -> tuple[dict[str, Any], Derived]:
    listing = trim_order(order_listing)
    derived = derive_orders(listing, sdk, curation["excludedIds"])
    # Excluded models stay out of the snapshot.
    source = [m for m in listing if m["model_id"] not in derived.excluded]
    descriptions = trim_descriptions(descriptions_listing, set(derived.relevance_order))
    ordered = {i: descriptions[i] for i in derived.relevance_order if i in descriptions}
    methods = trim_methods(descriptions_listing, order_listing, derived.relevance_order)
    snapshot = {
        "source": source,
        "descriptions": ordered,
        "methods": methods,
        "relevance_order": derived.relevance_order,
        "base_order": derived.base_order,
    }
    return snapshot, derived


def committed_snapshot() -> dict[str, Any]:
    return {
        "source": read_json(SOURCE_FIXTURE),
        "descriptions": read_json(DESCRIPTIONS_FIXTURE),
        "methods": read_json(METHODS_FIXTURE),
        "relevance_order": read_json(RELEVANCE_FIXTURE),
        "base_order": read_json(BASE_ORDER_FIXTURE),
    }


# ----------------------------------------------------------------------------------- CLI


def _say_skipped(derived: Derived) -> None:
    if derived.excluded:
        print(f"  excluded by curation: {', '.join(derived.excluded)}")
    if derived.skipped:
        print(
            f"  skipped, the pinned SDK has no accessor: {', '.join(derived.skipped)}"
        )


def _shown(path: Path) -> str:
    root = HERE.parents[1]
    return str(path.relative_to(root)) if path.is_relative_to(root) else str(path)


def cmd_regenerate(check: bool) -> int:
    outputs = offline_outputs()
    stale = stale_files(outputs)
    names = ", ".join(_shown(p) for p in stale)
    if check:
        if stale:
            print(
                f"models catalogue is stale: {names}\nrun pnpm update:pyapi",
                file=sys.stderr,
            )
            return 1
        print("models catalogue is current")
        return 0
    write_files(outputs)
    print(
        f"models catalogue: wrote {names}" if stale else "models catalogue: unchanged"
    )
    return 0


def cmd_refresh() -> int:
    sdk, curation = load_sdk_models(), load_curation()
    order_listing, descriptions_listing = fetch_listings()
    snapshot, derived = fetched_snapshot(
        order_listing, descriptions_listing, sdk, curation
    )
    outputs = build_outputs(
        snapshot["source"],
        snapshot["descriptions"],
        snapshot["methods"],
        sdk,
        model_examples.load_sdk_classes(),
        curation,
        PAGES.read_text(encoding="utf-8"),
    )
    changed = write_files(outputs)
    _say_skipped(derived)
    undescribed = [
        i for i in derived.relevance_order if i not in snapshot["descriptions"]
    ]
    if undescribed:
        print(f"  no public description: {', '.join(undescribed)}")
    print(
        "models catalogue: "
        + (f"wrote {', '.join(p.name for p in changed)}" if changed else "unchanged")
    )
    return 0


def cmd_report() -> int:
    sdk, curation = load_sdk_models(), load_curation()
    order_listing, descriptions_listing = fetch_listings()
    fresh, derived = fetched_snapshot(
        order_listing, descriptions_listing, sdk, curation
    )
    _say_skipped(derived)
    lines = drift_lines(committed_snapshot(), fresh)
    if not lines:
        print("models catalogue: no drift against the committed snapshot")
        return 0
    print("models catalogue: drift against the committed snapshot")
    print("\n".join(f"  {line}" for line in lines))
    print("run pnpm update:pyapi:models to refresh")
    return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--check",
        action="store_true",
        help="fail if the derived fixtures or pages.json are stale",
    )
    group.add_argument(
        "--refresh",
        action="store_true",
        help="fetch both listings and rewrite the snapshot",
    )
    group.add_argument(
        "--report",
        action="store_true",
        help="fetch both listings, print drift, write nothing",
    )
    args = parser.parse_args(argv)
    try:
        if args.refresh:
            return cmd_refresh()
        if args.report:
            return cmd_report()
        return cmd_regenerate(args.check)
    except CatalogueError as error:
        print(f"models catalogue: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
