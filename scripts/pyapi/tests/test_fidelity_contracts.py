import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def entry(path):
    spec = json.loads((ROOT / "specs" / (path.rsplit(".", 1)[0] + ".json")).read_text())
    return next(e for e in spec["entries"] if e["path"] == path)


class FidelityContractsTests(unittest.TestCase):
    def test_parameter_annotation_and_overloads(self):
        model = entry("openprotein.models.ProteinLanguageModel")
        embed = next(m for m in model["members"] if m["name"] == "embed")
        params = next(s["items"] for s in embed["parsed"] if s["kind"] == "parameters")
        self.assertIn(
            "AssayDataset", next(p for p in params if p["name"] == "sequences")["type"]
        )
        future = entry("openprotein.jobs.EmbeddingFuture")
        get = next(m for m in future["members"] if m["name"] == "get")
        self.assertGreaterEqual(len(get["overload_contracts"]), 2)
        self.assertNotEqual(
            get["overload_contracts"][0]["returns"],
            get["overload_contracts"][1]["returns"],
        )
        self.assertTrue(
            any(
                "id" in o["signature"]
                for o in entry("openprotein.models.GP")["overload_contracts"]
            )
        )

    def test_explicit_publication_and_negative_controls(self):
        expected = {
            "openprotein.jobs.JobStatus": {
                "CREATED",
                "PENDING",
                "RUNNING",
                "SUCCESS",
                "FAILURE",
                "RETRYING",
                "CANCELED",
            },
            "openprotein.predictor.KernelType": {
                "LINEAR",
                "RBF",
                "MATERN12",
                "MATERN32",
                "MATERN52",
                "PERIODIC",
                "RATIONAL_QUADRATIC",
            },
            "openprotein.common.FeatureType": {"PLM", "SVD"},
            "openprotein.design.schemas.DesignResult": {
                "step",
                "sample_index",
                "sequence",
                "scores",
                "subscores",
                "means",
                "vars",
            },
            "openprotein.jobs.Future": {
                "units",
                "unit",
                "outputs",
                "get_item",
                "stream",
            },
            "openprotein.design.DesignFuture": {"get", "wait", "stream"},
        }
        for path, names in expected.items():
            with self.subTest(path=path):
                actual = {m["name"] for m in entry(path)["members"]}
                self.assertTrue(names <= actual, names - actual)
                self.assertFalse(any(n.startswith("_") for n in actual))

    def test_annotation_fallback_preserves_documented_types_and_scope(self):
        import sys
        import tempfile

        import griffe

        sys.path.insert(0, str(ROOT / "scripts/pyapi"))
        from members import describe, select

        source = '''\
class Wanted:
    pass
class Other:
    pass
class Example:
    def call(self, value: Wanted, other: Wanted, count: int = 3, **kwargs: str):
        """Do work.

        Parameters
        ----------
        value : str
            Keep this description.
        """
'''
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / "fixture.py").write_text(source)
            module = griffe.load(
                "fixture", search_paths=[directory], allow_inspection=False
            )
            cls = module["Example"]
            selected = select(module, cls, {"members": True})
            name, member, extra = next(row for row in selected if row[0] == "call")

            def resolve(path):
                return (
                    {"path": "fixture.Wanted", "page": "fixture"}
                    if path == "fixture.Wanted"
                    else None
                )

            described = describe(module, cls, name, member, extra, resolve)
            params = next(
                s["items"] for s in described["parsed"] if s["kind"] == "parameters"
            )
            self.assertEqual(params[0]["type"], "str")
            other = next(p for p in params if p["name"] == "other")
            self.assertEqual(other["type_parts"][0]["path"], "fixture.Wanted")
            self.assertEqual(params[0]["text"], "Keep this description.")
            count = next(p for p in params if p["name"] == "count")
            self.assertEqual((count["type"], count["default"]), ("int", "3"))
            kwargs = next(p for p in params if p["name"] == "**kwargs")
            self.assertIsNone(kwargs["default"])

    def test_typed_overload_links_and_variadics(self):
        model = entry("openprotein.models.GP")
        overload = next(
            o for o in model["overload_contracts"] if "id:" in o["signature"]
        )
        self.assertEqual(overload["returns"], "GPModel")
        self.assertTrue(
            any(
                p.get("path") == "openprotein.models.GPModel"
                for p in overload["returns_parts"]
            )
        )
        future = entry("openprotein.jobs.EmbeddingFuture")
        get = next(m for m in future["members"] if m["name"] == "get")
        self.assertTrue(
            all(
                "**kwargs: Any={}" not in o["signature"]
                for o in get["overload_contracts"]
            )
        )

    def test_builtin_list_is_not_a_clustering_member_link(self):
        model = entry("openprotein.clustering.ClusteringAPI")
        method = next(m for m in model["members"] if m["name"] == "hierarchical")
        for contract in method["overload_contracts"]:
            self.assertFalse(
                any(
                    p.get("path", "").endswith("ClusteringAPI.list")
                    for p in contract["signature_parts"]
                )
            )
        parameters = next(
            s["items"] for s in method["parsed"] if s["kind"] == "parameters"
        )
        sequences = next(p for p in parameters if p["name"] == "sequences")
        self.assertFalse(
            any(
                p.get("path", "").endswith("ClusteringAPI.list")
                for p in sequences["type_parts"]
            )
        )

    def test_builtin_list_fixture_with_later_method(self):
        import sys
        import tempfile

        import griffe

        sys.path.insert(0, str(ROOT / "scripts/pyapi"))
        from members import parameter_sections

        source = """\
class Example:
    def use(self, values: list[str]):
        pass
    def list(self):
        pass
"""
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / "fixture.py").write_text(source)
            module = griffe.load(
                "fixture", search_paths=[directory], allow_inspection=False
            )
            func = module["Example"]["use"]
            resolve = lambda path: (
                {"path": path, "page": "fixture"}
                if path.endswith("Example.list")
                else None
            )
            sections = parameter_sections([], func, resolve)
            self.assertTrue(
                all(
                    "path" not in part for part in sections[0]["items"][0]["type_parts"]
                )
            )

    def test_field_metadata_has_separate_display_defaults(self):
        model = entry("openprotein.models.MethodDescriptor")
        fields = {m["name"]: m for m in model["members"]}
        self.assertTrue(fields["path"]["value"].startswith("Field("))
        self.assertIsNone(fields["path"]["display_value"])
        self.assertIsNone(fields["outputs"]["display_value"])
        self.assertEqual(fields["name"]["display_value"], "None")
