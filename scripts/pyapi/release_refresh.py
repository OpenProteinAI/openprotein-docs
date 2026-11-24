"""Release-gated documentation transformation; never import the SDK."""

import argparse
import ast
import copy
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path.cwd()
BASE = "1b8c48fe3e8772d4ab33b6e1edc28c086bf9087e"
DEPLOYED = "196ac0f88ea40719563b1d659dd020bb45d15c47"
NAMES = [
    "TaskFuture",
    "FutureUnit",
    "AttentionFuture",
    "EmbeddingFuture",
    "IndelScoreFuture",
    "LogLikelihoodFuture",
    "LogitsFuture",
    "PredictionFuture",
    "SequenceGenerationFuture",
    "SingleSitePredictionFuture",
    "SingleSiteScoreFuture",
    "StructureDesignFuture",
    "StructurePredictionFuture",
    "FitFuture",
    "SVDFitFuture",
    "UMAPFitFuture",
    "GPFitFuture",
    "CrossvalidateFuture",
]
MOVES = {"openprotein.models." + n: "openprotein.jobs." + n for n in NAMES}
MOVES["openprotein.models.future.FitFuture"] = MOVES.pop("openprotein.models.FitFuture")
MOVES["openprotein.data.prompts.future.PromptFuture"] = (
    "openprotein.data.prompts.PromptFuture"
)
KERNELS = [
    "TrainedKernel",
    "LinearKernel",
    "RBFKernel",
    "Matern12Kernel",
    "Matern32Kernel",
    "Matern52Kernel",
    "PeriodicKernel",
    "RationalQuadraticKernel",
]
BEHAVIORS = {
    "task-primary",
    "fit-named-output",
    "prompt-sampling",
    "reload-gp",
    "reload-cv",
    "reload-prompt",
    "plain-job",
    "fold-order",
    "legacy-deprecation",
    "opendde",
    "release-search-task-output",
    "prompt-content-reader",
    "gp-no-custom-folds",
    "svd-holdbacks",
}
GROUPS = [
    "Language models",
    "Structure prediction",
    "Design and inverse folding",
    "Trainable models",
]
TASK = "Model methods return futures for their submitted tasks. The [Jobs reference](/references/python-api/jobs) documents task futures, per-position results and fitted-model results.\n\nFor a specialized task future with per-position result type `T`, `get()` and `wait()` return `list[T]`. `get_item()` and unit reads return one `T`; `stream()` yields results in order. Bare reads select the task's primary output. Use `get(output=...)` or `wait(output=...)` to select a named output, which has its own result type."
FIT = "Use `session.models.SVD`, `session.models.UMAP` and `session.models.GP` to create estimators. Their fitting methods return fit futures. Call `get()` or `wait()` on the fit future to retrieve the fitted model, or select `output=...` to read a named fit output. Fitted models expose their supported transformation, prediction, chaining and deletion methods."
RELOAD = "Model-task records use [Job](#openprotein.jobs.Job). Supported task records reload through `session.jobs.get(...)` as the corresponding task future. A reloaded job does not always retain the exact future class returned at submission: GP training uses [PredictorModel](/references/python-api/predictor#openprotein.predictor.PredictorModel), GP cross-validation uses [CVResultFuture](/references/python-api/predictor#openprotein.predictor.validate.CVResultFuture), and prompt sampling uses the compatibility [Prompt](/references/python-api/prompt#openprotein.prompt.Prompt) reader. Refer to each reader's result contract."
PROMPT = "An MSA can be downloaded, updated or deleted. A prompt-sampling [PromptFuture](#openprotein.data.prompts.PromptFuture) returns `list[list[str]]`, with one sequence group per replicate. `session.data.prompts.get(...)` retrieves a stored [Prompt](#openprotein.data.prompts.Prompt) handle. Reloaded sampling jobs use the compatibility [Prompt](/references/python-api/prompt#openprotein.prompt.Prompt) reader."
NOTICE = "The legacy [`session.svd`](#openprotein.svd.SVDAPI) and [`session.umap`](#openprotein.umap.UMAPAPI) interfaces are deprecated compatibility APIs. For new code, create and manage these estimators through [`session.models.SVD`](/references/python-api/models#openprotein.models.ModelsAPI.SVD) and [`session.models.UMAP`](/references/python-api/models#openprotein.models.ModelsAPI.UMAP)."


def repo_url(url):
    """A GitHub remote as its https URL, lowercased, without `.git`."""
    url = url.strip().lower().removesuffix(".git")
    return re.sub(r"^git@github\.com:", "https://github.com/", url)


def require(value, message):
    if not value:
        raise ValueError(message)


def exact(row, fields):
    require(
        isinstance(row, dict) and set(row) == set(fields.split()),
        "invalid release-input fields",
    )


def dotted(value):
    return (
        isinstance(value, str)
        and re.fullmatch(r"openprotein(?:\.[A-Za-z_]\w*)+", value) is not None
    )


def schema(h):
    exact(
        h,
        "schema repository commit branch version criterion27 symbols removed private excluded accessors kernels jobSchemas foldHelper behaviors",
    )
    require(
        type(h["schema"]) is int and h["schema"] == 1,
        "unsupported release-input schema",
    )
    require(
        h["repository"] == "https://github.com/OpenProteinAI/openprotein-python",
        "wrong release repository",
    )
    require(
        isinstance(h["commit"], str) and re.fullmatch(r"[a-f0-9]{40}", h["commit"]),
        "immutable release SHA required",
    )
    require(
        h["commit"]
        not in {
            "3f737afe89688d842d59a4d6dc258e4131840ae0",
            "5f2f775bc5d4f965677429d5aad269181c490c8f",
        },
        "old or develop SHA is not the final release",
    )
    require(h["branch"] == "release/v0.18.0", "release branch provenance required")
    require(
        h["version"] is None
        or isinstance(h["version"], str)
        and bool(h["version"].strip()),
        "version is deferred or an observed distribution version",
    )
    exact(h["criterion27"], "releaseCommit reportSha256")
    require(
        h["criterion27"]["releaseCommit"] == h["commit"], "criterion27 release mismatch"
    )
    require(
        isinstance(h["criterion27"]["reportSha256"], str)
        and re.fullmatch(r"[a-f0-9]{64}", h["criterion27"]["reportSha256"]),
        "criterion27 report digest required",
    )
    for key in (
        "symbols",
        "accessors",
        "behaviors",
        "removed",
        "private",
        "excluded",
        "kernels",
        "jobSchemas",
    ):
        require(isinstance(h[key], list), f"{key} must be an array")
    for key in ("removed", "private", "excluded", "kernels", "jobSchemas"):
        require(
            all(dotted(v) for v in h[key]) and len(h[key]) == len(set(h[key])),
            f"invalid {key} paths",
        )
    require(
        "openprotein.models.ModelsJob" in h["removed"]
        and "openprotein.models.MODELS_JOB_TYPE" in h["removed"],
        "settled deletions missing",
    )
    require(
        all(
            any(p.endswith("." + name) for p in h["excluded"])
            for name in ("MSASearchFuture", "SearchJob", "CVResults")
        ),
        "release search/CVResults exclusions missing",
    )
    require(
        {p.rsplit(".", 1)[1] for p in h["kernels"]} == set(KERNELS),
        "complete trained-kernel exports required",
    )
    require(
        all(p.startswith("openprotein.models.") for p in h["kernels"]),
        "kernels must be canonical models exports",
    )
    require(
        all(p.startswith("openprotein.jobs.") for p in h["jobSchemas"]),
        "job schemas must be public jobs exports",
    )
    seen = set()
    for row in h["symbols"]:
        exact(row, "public canonical file qualname")
        require(
            dotted(row["public"]) and dotted(row["canonical"]), "invalid symbol path"
        )
        require(row["public"] not in seen, "duplicate public symbol")
        seen.add(row["public"])
        source_location(row)
    require(
        set(MOVES.values()) | set(h["kernels"]) | set(h["jobSchemas"]) <= seen,
        "required release exports missing",
    )
    require(
        not seen.intersection(h["removed"] + h["private"] + h["excluded"]),
        "private/removed/develop symbol exposed",
    )
    names = set()
    for row in h["accessors"]:
        exact(row, "name modelId interface aliasOf opendde")
        require(
            isinstance(row["name"], str)
            and row["name"].isidentifier()
            and row["name"] not in names,
            "duplicate/invalid accessor",
        )
        names.add(row["name"])
        require(
            isinstance(row["interface"], str)
            and row["interface"] in seen
            and row["interface"].startswith("openprotein.models."),
            "accessor interface lacks export proof",
        )
        require(
            row["modelId"] is None
            or isinstance(row["modelId"], str)
            and bool(row["modelId"]),
            "invalid model ID",
        )
        require(
            row["aliasOf"] is None
            or isinstance(row["aliasOf"], str)
            and row["aliasOf"].isidentifier(),
            "invalid alias",
        )
        require(type(row["opendde"]) is bool, "invalid OpenDDE marker")
        require(
            not row["opendde"] or bool(row["modelId"]) and row["aliasOf"] is None,
            "OpenDDE handles require source model IDs, not guessed aliases",
        )
    require(
        sum(row["opendde"] for row in h["accessors"]) == 2,
        "exactly two source-proven OpenDDE accessors required",
    )
    require(
        all(
            row["aliasOf"] is None or row["aliasOf"] in names for row in h["accessors"]
        ),
        "unknown alias accessor",
    )
    ids = []
    for row in h["behaviors"]:
        exact(row, "id file qualname contains")
        source_location(row)
        require(isinstance(row["id"], str) and row["id"], "behavior ID required")
        require(
            isinstance(row["contains"], list)
            and row["contains"]
            and all(isinstance(v, str) and v.strip() for v in row["contains"]),
            "nonempty literal source citations required",
        )
        ids.append(row["id"])
    require(
        len(ids) == len(set(ids)) and BEHAVIORS <= set(ids),
        "required behavior citations missing/duplicated",
    )
    exact(h["foldHelper"], "file qualname")
    source_location(h["foldHelper"])
    return h


def source_location(row):
    require(
        isinstance(row["file"], str)
        and re.fullmatch(
            r"openprotein/(?:[A-Za-z_]\w*/)*[A-Za-z_]\w*\.py", row["file"]
        ),
        "invalid source file",
    )
    require(
        isinstance(row["qualname"], str)
        and all(p.isidentifier() for p in row["qualname"].split(".")),
        "invalid source qualname",
    )


def definition(text, row):
    node = ast.parse(text)
    for name in row["qualname"].split("."):
        nodes = [
            n
            for n in node.body
            if isinstance(n, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef))
            and n.name == name
        ]
        require(
            bool(nodes), f"source definition absent: {row['file']}:{row['qualname']}"
        )
        node = nodes[-1]
    return node


def git(checkout, *args):
    return subprocess.check_output(
        ["git", "-C", str(checkout), *args],
        env=dict(os.environ, GIT_NO_REPLACE_OBJECTS="1"),
    )


def separate_bytecode(actual, expected):
    sources = dict(actual)
    excluded = {}
    for path in sorted(set(actual) - set(expected)):
        match = re.fullmatch(r"(.+)/__pycache__/([A-Za-z_]\w*)\.cpython-313\.pyc", path)
        if match is None:
            raise ValueError("unexpected non-source export file: " + path)
        counterpart = match[1] + "/" + match[2] + ".py"
        require(
            counterpart in expected
            and actual.get(counterpart) == expected[counterpart],
            "orphan or mismatched bytecode source: " + path,
        )
        excluded[path] = hashlib.sha256(sources.pop(path)).hexdigest()
    return sources, excluded


def source_proof(h, checkout, report):
    require(
        hashlib.sha256(report.read_bytes()).hexdigest()
        == h["criterion27"]["reportSha256"],
        "criterion27 report bytes mismatch",
    )
    require(
        git(checkout, "rev-parse", h["commit"] + "^{commit}").decode().strip()
        == h["commit"],
        "immutable release commit object mismatch",
    )
    remote = git(checkout, "remote", "get-url", "origin").decode().strip()
    install = os.environ.get("OP_SDK_GIT_URL") or h["repository"]
    require(
        repo_url(remote) in {repo_url(h["repository"]), repo_url(install)},
        "source remote identity mismatch",
    )

    def node(row):
        return definition(
            git(checkout, "show", h["commit"] + ":" + row["file"]).decode(), row
        )

    for row in h["symbols"] + h["behaviors"] + [h["foldHelper"]]:
        node(row)
    for row in h["behaviors"]:
        text = ast.unparse(node(row))
        require(
            all(part in text for part in row["contains"]),
            f"source behavior differs: {row['id']}",
        )


def measured_identity(h, dist):
    direct = json.loads(dist.read_text("direct_url.json") or "null")
    require(isinstance(direct, dict), "installed PEP 610 metadata absent")
    require(
        direct.get("url", "").removesuffix(".git").lower() == h["repository"].lower()
        and direct["vcs_info"]["vcs"] == "git"
        and direct["vcs_info"]["commit_id"] == h["commit"],
        "installed PEP 610 identity mismatch",
    )
    from pip._vendor.packaging.version import Version

    require(
        bool(dist.version) and str(Version(dist.version)),
        "invalid PEP 440 distribution version",
    )
    require(
        h["version"] is None or dist.version == h["version"],
        "installed version differs: reconcile actual metadata, never fabricate a release",
    )
    return dist.version, direct


def installed_proof(h, checkout):
    import sysconfig
    from importlib.metadata import distribution

    sys.path.insert(0, str(ROOT / "scripts/pyapi"))
    from generate import lookup
    from sdk import deref, load_sdk

    dist = distribution("openprotein-python")
    _, direct = measured_identity(h, dist)
    files = (
        git(checkout, "ls-tree", "-r", "--name-only", h["commit"], "openprotein")
        .decode()
        .splitlines()
    )
    site_root = dist.locate_file("")
    package_root = dist.locate_file("openprotein")
    if not isinstance(site_root, Path) or not isinstance(package_root, Path):
        raise TypeError("installed distribution must use filesystem paths")
    installed = {str(p.relative_to(site_root)) for p in package_root.rglob("*.py")}
    require(
        installed == {p for p in files if p.endswith(".py")},
        "installed/archive Python file sets differ; account for build-generated files explicitly before proceeding",
    )
    for name in files:
        if name.endswith(".py"):
            require(
                dist.locate_file(name).read_bytes()
                == git(checkout, "show", h["commit"] + ":" + name),
                f"installed/archive bytes differ: {name}",
            )
    package, shadow, _ = load_sdk(Path(sysconfig.get_paths()["purelib"]))
    try:
        for row in h["symbols"]:
            obj = deref(lookup(package, row["public"]))
            require(
                obj.canonical_path == row["canonical"],
                f"export identity mismatch: {row['public']}",
            )
            require(
                str(obj.filepath.relative_to(shadow)) == row["file"],
                f"defining file mismatch: {row['public']}",
            )
        for name in h["removed"] + h["excluded"]:
            try:
                lookup(package, name)
            except (KeyError, AttributeError):
                pass
            else:
                raise ValueError(f"removed/develop export still present: {name}")
        sys.path.insert(0, str(ROOT))
        from scripts.pyapi.tests.test_navigation import sdk_accessors

        actual = sdk_accessors()
        wanted = {
            r["name"]: (r["modelId"], r["interface"].rsplit(".", 1)[1], r["aliasOf"])
            for r in h["accessors"]
        }
        require(actual == wanted, "accessor inventory differs from final-source AST")
    finally:
        shutil.rmtree(shadow)
    return {
        "commit": h["commit"],
        "version": dist.version,
        "directUrl": direct,
        "pythonFilesMatched": sum(p.endswith(".py") for p in files),
        "files": {
            p: hashlib.sha256(dist.locate_file(p).read_bytes()).hexdigest()
            for p in files
            if p.endswith(".py")
        },
    }


def section(manifest, page, heading):
    owner = next(p for p in manifest["pages"] if p["page"] == page)
    return next(s for s in owner["sections"] if s["heading"] == heading)


def new_section(heading, prose, entries):
    return {
        "heading": heading,
        "level": 2,
        "prose": prose,
        "entries": entries,
        "autosummary": [],
    }


def transform(manifest, h, groups):
    result = copy.deepcopy(manifest)
    moves = dict(MOVES)
    moves.update(
        {"openprotein.predictor." + p.rsplit(".", 1)[1]: p for p in h["kernels"]}
    )
    moved = {}
    for page in result["pages"]:
        for sec in page["sections"]:
            keep = []
            for entry in sec["entries"]:
                old = entry["target"]
                if old in moves:
                    require(old not in moved, "duplicate curated move")
                    entry["target"] = moves[old]
                    moved[old] = entry
                    if old.endswith(".PromptFuture"):
                        keep.append(entry)
                elif old not in h["removed"] + h["private"] + h["excluded"]:
                    keep.append(entry)
            sec["entries"] = keep
    require(
        set(moves) == set(moved),
        "curation move is absent or duplicated; reconcile baseline",
    )
    jobs = next(p for p in result["pages"] if p["page"] == "jobs")
    section(result, "jobs", None)["prose"] = (
        "Use `session.jobs.list(...)` and `session.jobs.get_job(...)` to inspect job records. Use `session.jobs.get(...)` to load a future and read its results. A job record describes the submission and its status; the future provides the result-reading methods."
    )
    fit_names = {
        "FitFuture",
        "SVDFitFuture",
        "UMAPFitFuture",
        "GPFitFuture",
        "CrossvalidateFuture",
    }
    tasks, fits = [], []
    for old, new in MOVES.items():
        if new.startswith("openprotein.jobs."):
            (fits if new.rsplit(".", 1)[1] in fit_names else tasks).append(moved[old])
    jobs["sections"] += [
        new_section(
            "Task results",
            "Task futures expose submitted inputs, named outputs and per-position results. Use `unit(position)` to inspect one position and read its output. Specialized futures document the type returned for each position; selecting a different named output can return a different type.",
            tasks,
        ),
        new_section(
            "Fitted-model results",
            "`SVDFitFuture`, `UMAPFitFuture` and `GPFitFuture` return the fitted model from bare `get()` and `wait()` calls. With `output=...`, these methods return values for the selected fit output. `CrossvalidateFuture` returns the cross-validation result mapping.",
            fits,
        ),
        new_section("Job records and reloading", RELOAD, []),
    ]
    all_targets = {
        e["target"]
        for p in result["pages"]
        for s in p["sections"]
        for e in s["entries"]
    }
    for target in h["jobSchemas"]:
        if target not in all_targets:
            section(result, "jobs", "Task job schemas")["entries"].append(
                {
                    "directive": "autoclass",
                    "target": target,
                    "options": {"members": True, "inherited-members": True},
                }
            )
    intro = section(result, "models", None)["prose"]
    paragraphs = intro.split("\n\n")
    table = next(p for p in paragraphs if p.startswith("| Future |"))
    kernel = next(p for p in paragraphs if p.startswith("Fitted GP models expose"))
    section(result, "models", None)["prose"] = (
        paragraphs[0] + "\n\n" + TASK + "\n\n" + table + "\n\n" + kernel
    )
    section(result, "models", "Task results")["prose"] = TASK
    section(result, "models", "Fitted models")["prose"] = (
        FIT
        + "\n\nSee [fitted-model results](/references/python-api/jobs#fitted-model-results) for fit and cross-validation futures."
    )
    section(result, "models", "Shared types")["prose"] = (
        "Descriptions, method descriptors and model metadata describe discovery and outputs. Model-task records use [Job](/references/python-api/jobs#openprotein.jobs.Job); compatibility readers retain their documented result contracts."
    )
    models = next(p for p in result["pages"] if p["page"] == "models")
    models["sections"].append(
        new_section(
            "Fitted kernels",
            section(result, "predictor", "Fitted kernels")["prose"],
            [moved["openprotein.predictor." + n] for n in KERNELS],
        )
    )
    exports = {r["public"]: r["canonical"] for r in h["symbols"]}
    links = []
    for target in h["kernels"]:
        old = "openprotein.predictor." + target.rsplit(".", 1)[1]
        if old in exports:
            require(
                exports[old] == exports[target],
                f"kernel reexport identity differs: {old}",
            )
            links.append(f"[`{old}`](/references/python-api/models#{target})")
    section(result, "predictor", "Fitted kernels")["prose"] = (
        "See the [trained kernels](/references/python-api/models#fitted-kernels) documented with fitted models."
        + (" Retained predictor reexports: " + ", ".join(links) + "." if links else "")
    )
    results = [s for s in models["sections"] if s["heading"] == "Results"]
    require(len(results) == 2, "published Results headings changed")
    results[0]["prose"] = (
        "Structure design tasks return complexes through [StructureDesignFuture](/references/python-api/jobs#openprotein.jobs.StructureDesignFuture). The compatibility future remains available when reloading legacy jobs."
    )
    results[1]["prose"] = (
        "See [StructureDesignFuture](/references/python-api/jobs#openprotein.jobs.StructureDesignFuture) for typed design results. The compatibility future continues to read legacy BoltzGen jobs."
    )
    section(result, "data", "Alignments and sampled prompts")["prose"] = PROMPT
    section(result, "embedding", "Transform Models")["prose"] += "\n\n" + NOTICE
    for page in result["pages"]:
        if page["page"] != "jobs":
            continue
        for sec in page["sections"]:
            for entry in sec["entries"]:
                if entry.get("target") == "openprotein.jobs.Job":
                    entry["options"]["undoc-members"] = True
    # Only literal existing targets are rewritten; no regex or prefix migration.
    for p in result["pages"]:
        for sec in p["sections"]:
            text = sec.get("prose") or ""
            for old, new in moves.items():
                target_page = (
                    "jobs"
                    if new.startswith("openprotein.jobs.")
                    else "data"
                    if new.startswith("openprotein.data.")
                    else "models"
                )
                for prefix in (
                    "",
                    "/references/python-api/models",
                    "/references/python-api/predictor",
                    "/references/python-api/data",
                ):
                    text = text.replace(
                        "(" + prefix + "#" + old + ")",
                        "(/references/python-api/" + target_page + "#" + new + ")",
                    )
            sec["prose"] = text if sec.get("prose") is not None else None
    current = {
        e["target"]
        for p in result["pages"]
        for s in p["sections"]
        for e in s["entries"]
    }
    for row in h["accessors"]:
        target = row["interface"]
        if target not in current:
            section(result, "models", "Model interfaces")["entries"].append(
                {
                    "directive": "autoclass",
                    "target": target,
                    "options": {"members": True, "inherited-members": True},
                }
            )
            current.add(target)
    require(
        current <= {r["public"] for r in h["symbols"]},
        "curated export missing from final handoff",
    )
    require(
        not current.intersection(h["removed"] + h["private"] + h["excluded"]),
        "curation exposes private/develop/removed names",
    )
    overview = section(result, "models", "Models")
    text = overview["prose"].split("\n\n**", 1)[0]
    for group in GROUPS:
        text += f"\n\n**{group}**\n\n| Model ID | Accessors | Interface |\n| --- | --- | --- |"
        rows = {}
        for row in h["accessors"]:
            if groups[row["interface"]] == group:
                rows.setdefault((row["modelId"], row["interface"]), []).append(row)
        for (model_id, family), values in rows.items():
            links = []
            for row in values:
                name = row["name"]
                link = f"[`{name}`](#openprotein.models.ModelsAPI.{name})"
                if row["aliasOf"]:
                    link += f" (alias of `{row['aliasOf']}`)"
                links.append(link)
            label = family.rsplit(".", 1)[1]
            text += (
                "\n| "
                + (f"`{model_id}`" if model_id else "—")
                + " | "
                + ", ".join(links)
                + f" | [`{label}`](#{family}) |"
            )
    overview["prose"] = text
    return result


def derive_groups(manifest, h):
    groups = {}
    group = None
    for line in section(manifest, "models", "Models")["prose"].splitlines():
        if line.strip("*") in GROUPS:
            group = line.strip("*")
        for family in re.findall(r"\]\(#(openprotein\.models\.[\w]+)\)", line):
            if ".ModelsAPI" not in family:
                groups[family] = group
    import sysconfig

    sys.path.insert(0, str(ROOT / "scripts/pyapi"))
    from generate import lookup
    from sdk import deref, load_sdk

    package, shadow, _ = load_sdk(Path(sysconfig.get_paths()["purelib"]))
    bases = {
        "ProteinLanguageModel": GROUPS[0],
        "StructurePredictionModel": GROUPS[1],
        "StructureGenerativeModel": GROUPS[2],
    }
    try:
        for row in h["accessors"]:
            target = row["interface"]
            if target in groups:
                continue
            obj = deref(lookup(package, target))
            ancestry = {c.name for c in obj.mro()}
            found = {value for name, value in bases.items() if name in ancestry}
            require(
                len(found) == 1,
                f"ambiguous discovery group: {target}; docs review required",
            )
            groups[target] = found.pop()
    finally:
        shutil.rmtree(shadow)
    return groups


def publication():
    result = {}
    for file in sorted(Path("specs").glob("openprotein*.json")):
        for entry in json.loads(file.read_text())["entries"]:
            if not entry.get("page") or entry.get("summary_only"):
                continue
            result[entry["path"]] = entry["page"]
            result.update(
                {
                    entry["path"] + "." + m["name"]: entry["page"]
                    for m in entry.get("members", [])
                }
            )
    return result


def candidates(h):
    history = set(
        map(
            tuple,
            json.loads(Path("scripts/pyapi/deployed-anchors.json").read_text())[
                "anchors"
            ],
        )
    )
    for file in Path("scripts/pyapi/golden").glob("*.json"):
        data = json.loads(file.read_text())
        for entry in data["classes"]:
            history.add((file.stem, entry["path"]))
            history.update((file.stem, m["path"]) for m in entry["members"])
        history.update((file.stem, m["id"]) for m in data["module_level"])
    prior = json.loads(
        git(ROOT, "show", BASE + ":scripts/pyapi/anchor-retirements.json")
    )
    existing = {(r["page"], r["anchor"]) for r in prior}
    current = publication()
    moves = dict(MOVES)
    moves.update(
        {"openprotein.predictor." + p.rsplit(".", 1)[1]: p for p in h["kernels"]}
    )

    def details(documents):
        result = {}
        for doc in documents:
            for entry in doc["entries"]:
                result[entry["path"]] = entry
                for member in entry.get("members", []):
                    result[entry["path"] + "." + member["name"]] = member
        return result

    old_files = (
        git(ROOT, "ls-tree", "-r", "--name-only", BASE, "specs").decode().splitlines()
    )
    before = details(
        [
            json.loads(git(ROOT, "show", BASE + ":" + f))
            for f in old_files
            if re.fullmatch(r"specs/openprotein.*\.json", f)
        ]
    )
    after = details(
        [
            json.loads(f.read_text())
            for f in sorted(Path("specs").glob("openprotein*.json"))
        ]
    )
    rows = []
    for page, old in sorted(history):
        if current.get(old) == page or (page, old) in existing:
            continue
        proposed = old if old in current else None
        for source, target in moves.items():
            if old == source or old.startswith(source + "."):
                name = target + old[len(source) :]
                if name in current:
                    proposed = name
        if old == "openprotein.models.ModelsJob" and "openprotein.jobs.Job" in current:
            proposed = "openprotein.jobs.Job"
        if old.startswith("openprotein.models.ModelsJob."):
            name = "openprotein.jobs.Job" + old[len("openprotein.models.ModelsJob") :]
            if name in current:
                proposed = name
        rows.append(
            {
                "page": page,
                "anchor": old,
                "candidate": {"page": current[proposed], "anchor": proposed}
                if proposed
                else None,
                "before": before.get(old),
                "after": after.get(proposed),
                "review": "required",
            }
        )
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "action", choices=["schema", "source", "installed", "curate", "candidates"]
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("--sdk", type=Path)
    parser.add_argument("--report", type=Path)
    parser.add_argument("--activate", type=Path)
    parser.add_argument("--receipt", type=Path)
    args = parser.parse_args()
    h = schema(json.loads(args.input.read_text()))
    if args.action == "source":
        source_proof(h, args.sdk, args.report)
    elif args.action == "installed":
        receipt = installed_proof(h, args.sdk)
        if args.activate or args.receipt:
            require(
                args.activate is not None and args.receipt is not None,
                "activation requires provenance receipt",
            )
            for output in (args.activate, args.receipt):
                require(
                    output.absolute().is_relative_to(
                        ROOT / "docs/superpowers/verification"
                    ),
                    "output must be owned ignored evidence",
                )
                require(
                    not output.exists() and not output.is_symlink(),
                    "refusing existing activation output",
                )
                require(
                    all(not p.is_symlink() for p in output.absolute().parents),
                    "symlink output parent",
                )
            receipt["sourceInputSha256"] = hashlib.sha256(
                args.input.read_bytes()
            ).hexdigest()
            activated = dict(h, version=receipt["version"])
            receipt["activatedInputSha256"] = hashlib.sha256(
                (json.dumps(activated, indent=2) + "\n").encode()
            ).hexdigest()
            args.receipt.write_text(json.dumps(receipt, indent=2) + "\n")
            args.activate.write_text(json.dumps(activated, indent=2) + "\n")
        else:
            require(
                h["version"] is not None,
                "unmeasured source input requires activation and receipt",
            )
        print(json.dumps(receipt))
    elif args.action == "curate":
        path = Path("scripts/pyapi/pages.json")
        manifest = json.loads(path.read_text())
        path.write_text(
            json.dumps(
                transform(manifest, h, derive_groups(manifest, h)),
                ensure_ascii=False,
                indent=2,
            )
            + "\n"
        )
    elif args.action == "candidates":
        print(json.dumps(candidates(h), indent=2))


if __name__ == "__main__":
    main()
