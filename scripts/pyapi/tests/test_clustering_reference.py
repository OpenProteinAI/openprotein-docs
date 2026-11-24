import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


class ClusteringReferenceTests(unittest.TestCase):
    def test_curation_and_published_dispositions(self):
        pages = json.loads((ROOT / "scripts/pyapi/pages.json").read_text())["pages"]
        names = [page["page"] for page in pages]
        self.assertEqual(names[names.index("jobs") + 1], "clustering")
        root = next(page for page in pages if page["page"] == "openprotein")
        self.assertNotIn("Clustering", [s["heading"] for s in root["sections"]])
        self.assertIn(
            '<a id="clustering" href="/references/python-api/clustering">',
            root["sections"][0]["prose"],
        )
        page = next(page for page in pages if page["page"] == "clustering")
        targets = [e["target"] for s in page["sections"] for e in s["entries"]]
        self.assertEqual(
            targets,
            [
                "openprotein.clustering.ClusteringAPI",
                "openprotein.clustering.HierarchicalClusteringFuture",
                "openprotein.clustering.HierarchicalClusteringResult",
                "openprotein.clustering.ClusteringMetadata",
            ],
        )
        entries = [
            e
            for f in (ROOT / "specs").glob("openprotein*.json")
            for e in json.loads(f.read_text())["entries"]
            if e.get("page") and not e.get("summary_only")
        ]
        moved = [e for e in entries if e["path"] in targets]
        self.assertEqual(len(moved), 4)
        self.assertTrue(all(e["page"] == "clustering" for e in moved))
        self.assertEqual(sum(len(e["members"]) for e in moved), 25)
        members = {
            e["path"].rsplit(".", 1)[-1]: [m["name"] for m in e["members"]]
            for e in moved
        }
        self.assertEqual(
            members,
            {
                "ClusteringAPI": ["hierarchical", "get", "list"],
                "HierarchicalClusteringFuture": [
                    "id",
                    "metadata",
                    "sequences",
                    "delete",
                    "redispatch",
                    "args",
                    "cancelled",
                    "created_date",
                    "description",
                    "done",
                    "end_date",
                    "get",
                    "job_id",
                    "job_type",
                    "name",
                    "progress_counter",
                    "refresh",
                    "rename",
                    "start_date",
                    "status",
                    "wait",
                    "wait_until_done",
                ],
                "HierarchicalClusteringResult": [],
                "ClusteringMetadata": [],
            },
        )
        published = [
            (e["page"], e["path"] + suffix)
            for e in entries
            for suffix in [""] + ["." + m["name"] for m in e.get("members", [])]
        ]
        self.assertEqual(len(published), len(set(published)))
        rows = [
            row
            for row in json.loads(
                (ROOT / "scripts/pyapi/anchor-retirements.json").read_text()
            )
            if row.get("replacement", {}).get("page") == "clustering"
        ]
        self.assertEqual(len(rows), 28)
        for row in rows:
            self.assertEqual(row["page"], "openprotein")
            self.assertNotIn((row["page"], row["anchor"]), published)
            self.assertEqual(
                published.count(
                    (row["replacement"]["page"], row["replacement"]["anchor"])
                ),
                1,
            )

    def test_source_aliases_are_static_imports(self):
        import ast
        from importlib.metadata import distribution

        def imports(relative):
            path = distribution("openprotein-python").locate_file(
                "openprotein/" + relative
            )
            return [
                n
                for n in ast.parse(path.read_text()).body
                if isinstance(n, ast.ImportFrom)
            ]

        root = imports("__init__.py")
        self.assertTrue(
            any(
                n.module == "openprotein.clustering"
                and any(a.name == "ClusteringAPI" for a in n.names)
                for n in root
            )
        )
        package = imports("clustering/__init__.py")
        for module, names in {
            "clustering": {"ClusteringAPI"},
            "models": {"HierarchicalClusteringFuture"},
            "schemas": {"HierarchicalClusteringResult", "ClusteringMetadata"},
        }.items():
            self.assertTrue(
                any(
                    n.level == 1
                    and n.module == module
                    and names <= {a.name for a in n.names}
                    for n in package
                )
            )

    def test_session_property_and_index_discovery(self):
        root = json.loads((ROOT / "specs/openprotein.json").read_text())
        session = next(
            e for e in root["entries"] if e["path"] == "openprotein.OpenProtein"
        )
        self.assertIn("clustering", [m["name"] for m in session["members"]])
        pages = json.loads((ROOT / "scripts/pyapi/pages.json").read_text())["pages"]
        headings = [s["heading"] for s in pages[0]["sections"]]
        self.assertEqual(
            headings[headings.index("Data") : headings.index("Clustering") + 1],
            ["Data", "Models", "Design", "Jobs", "Clustering"],
        )
        meta = json.loads(
            (ROOT / "content/docs/references/python-api/meta.json").read_text()
        )["pages"]
        self.assertEqual(meta, [p["page"] for p in pages if p["page"] != "index"])
