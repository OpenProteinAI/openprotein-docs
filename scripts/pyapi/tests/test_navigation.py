import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


class NavigationTests(unittest.TestCase):
    def test_model_navigation_and_compatibility_pages(self) -> None:
        manifest = json.loads((ROOT / "scripts/pyapi/pages.json").read_text())
        pages = manifest["pages"]
        names = [page["page"] for page in pages]
        self.assertEqual(
            names[names.index("data") : names.index("jobs") + 1],
            ["data", "models", "design", "jobs"],
        )
        names = [section["summarises"] for section in pages[0]["sections"]]
        self.assertEqual(
            names[names.index("data") : names.index("jobs") + 1],
            ["data", "models", "design", "jobs"],
        )
        meta = json.loads(
            (ROOT / "content/docs/references/python-api/meta.json").read_text()
        )
        self.assertEqual(meta["pages"], [page["page"] for page in pages[1:]])
        self.assertEqual(names, [page["page"] for page in pages[1:]])
        for name in ("embedding", "fold", "predictor"):
            text = (ROOT / f"content/docs/references/python-api/{name}.mdx").read_text()
            self.assertIn("status: deprecated", text)
            body = text.split("---", 2)[2]
            self.assertIn("deprecated", body.lower())
            self.assertIn("/references/python-api/models", body)


def sdk_accessors(
    excluded: bool = False,
) -> dict[str, tuple[str | None, str, str | None]]:
    """The SDK's model accessors; those of curation-excluded models only when `excluded`."""
    import ast
    import fnmatch
    from importlib.metadata import distribution

    path = distribution("openprotein-python").locate_file(
        "openprotein/models/models.py"
    )
    module = ast.parse(path.read_text())
    api = next(
        node
        for node in module.body
        if isinstance(node, ast.ClassDef) and node.name == "ModelsAPI"
    )
    result: dict[str, tuple[str | None, str, str | None]] = {}
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
            item for item in node.body if isinstance(item, ast.Return)
        ).value
        assert returned is not None
        if decorator.id == "cached_property":
            assert isinstance(returned, ast.Call)
            assert isinstance(returned.func, ast.Attribute)
            assert returned.func.attr == "_bind"
            assert isinstance(returned.func.value, ast.Attribute)
            assert isinstance(returned.func.value.value, ast.Name)
            assert returned.func.value.value.id == "estimators"
            result[node.name] = (None, returned.func.value.attr, None)
            continue
        if isinstance(returned, ast.Call):
            assert isinstance(returned.func, ast.Attribute)
            assert returned.func.attr == "_handle"
            assert isinstance(returned.args[0], ast.Constant)
            assert isinstance(returned.args[0].value, str)
            assert isinstance(returned.args[1], ast.Name)
            result[node.name] = (returned.args[0].value, returned.args[1].id, None)
        else:
            assert isinstance(returned, ast.Attribute)
            model_id, family, _ = result[returned.attr]
            result[node.name] = (model_id, family, returned.attr)
    if excluded:
        return result
    patterns = json.loads(
        (ROOT / "scripts/pyapi/models-catalogue.json").read_text()
    )["excludedIds"]
    return {
        name: row
        for name, row in result.items()
        if row[0] is None or not any(fnmatch.fnmatchcase(row[0], p) for p in patterns)
    }


def overview_rows(text: str) -> dict[str, tuple[str | None, str, str | None]]:
    import re

    rows: dict[str, tuple[str | None, str, str | None]] = {}
    for line in text.splitlines():
        match = re.fullmatch(
            r"\| (?:(`[^`]+`|—) \| )?(.+) \| \[`([^`]+)`\]\(#openprotein\.models\.([\w.]+)\) \|",
            line,
        )
        if not match:
            continue
        model_id, accessors, label, family = match.groups()
        if label != family.rsplit(".", 1)[-1]:
            raise ValueError("family label and target differ")
        for accessor in accessors.split(", "):
            item = re.fullmatch(
                r"\[`([\w]+)`\]\(#openprotein\.models\.ModelsAPI\.([\w]+)\)(?: \(alias of `([\w]+)`\))?",
                accessor,
            )
            if not item or item[1] != item[2] or item[1] in rows:
                raise ValueError("invalid or repeated accessor")
            rows[item[1]] = (
                None if model_id in (None, "—") else model_id[1:-1],
                family.rsplit(".", 1)[-1],
                item[3],
            )
    return rows


BASES = [
    base["model"]
    for base in json.loads(
        (ROOT / "scripts/pyapi/tests/fixtures/models-base-order.json").read_text()
    )
]


def models_prose(sections: list[dict]) -> str:
    """The Models section's own prose plus every base model section's, which carry the tables."""
    start = next(i for i, s in enumerate(sections) if s["heading"] == "Models")
    return "\n".join(s["prose"] for s in sections[start : start + 1 + len(BASES)])


class OverviewTests(unittest.TestCase):
    def test_overview_matches_pinned_sdk_and_is_visible(self) -> None:
        manifest = json.loads((ROOT / "scripts/pyapi/pages.json").read_text())
        models = next(page for page in manifest["pages"] if page["page"] == "models")
        self.assertEqual(
            [section["heading"] for section in models["sections"]],
            [
                None,
                "Interface",
                "List models",
                "Models",
                *BASES,
                "Model interfaces",
                "Task results",
                "Fitted models",
                "Shared types",
                "Referenced types",
                "Fitted kernels",
                "Deprecated results",
            ],
        )
        prose = models_prose(models["sections"])
        expected = sdk_accessors()
        self.assertEqual(overview_rows(prose), expected)
        rendered = (ROOT / "content/docs/references/python-api/models.mdx").read_text()
        for section in models["sections"]:
            if section["heading"] in {"List models", "Models", *BASES}:
                self.assertIn(section["prose"], rendered)
        self.assertIn("**Trainable models**", prose)
        self.assertLess(
            rendered.index('title="PoET-2"'), rendered.index("| `poet-2` |")
        )

    def test_overview_detects_omission_and_wrong_id(self) -> None:
        manifest = json.loads((ROOT / "scripts/pyapi/pages.json").read_text())
        models = next(page for page in manifest["pages"] if page["page"] == "models")
        prose = models_prose(models["sections"])
        expected = sdk_accessors()
        rows = prose.splitlines()
        target = next(
            line for line in rows if "#openprotein.models.ModelsAPI.poet2)" in line
        )
        self.assertNotEqual(overview_rows(prose.replace(target, "")), expected)
        self.assertNotEqual(
            overview_rows(prose.replace("| `poet-2` |", "| `wrong-id` |", 1)), expected
        )
