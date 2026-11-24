import ast
import json
import sysconfig
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
class CorrectedPublicationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.entries = {
            e["path"]: e
            for f in (ROOT / "specs").glob("openprotein*.json")
            for e in json.loads(f.read_text())["entries"]
            if e.get("page")
        }

    def test_recovered_job_targets_and_fields(self):
        names = [
            "AttentionFuture",
            "CrossvalidateFuture",
            "EmbeddingFuture",
            "GPFitFuture",
            "IndelScoreFuture",
            "LogLikelihoodFuture",
            "LogitsFuture",
            "PredictionFuture",
            "SVDFitFuture",
            "SequenceGenerationFuture",
            "SingleSitePredictionFuture",
            "SingleSiteScoreFuture",
            "StructureDesignFuture",
            "StructurePredictionFuture",
            "TaskFuture",
            "UMAPFitFuture",
        ]
        paths = ["openprotein.jobs." + n for n in names] + [
            "openprotein.data.prompts.PromptFuture"
        ]
        self.assertEqual(len(paths), 17)
        for path in paths:
            with self.subTest(path=path):
                member = next(
                    m for m in self.entries[path]["members"] if m["name"] == "job"
                )
                self.assertEqual(member["annotation"], "Job")
                self.assertEqual(
                    member["annotation_parts"],
                    [{"text": "Job", "path": "openprotein.jobs.Job", "page": "jobs"}],
                )
                self.assertEqual(
                    member["source"]["file"], "openprotein/jobs/futures.py"
                )
        fields = {m["name"]: m for m in self.entries["openprotein.jobs.Job"]["members"]}
        for name in ("job_type", "path", "provider_id", "version"):
            self.assertIn(name, fields)
            self.assertEqual(
                fields[name]["source"]["file"], "openprotein/jobs/schemas.py"
            )
        self.assertNotIn("args", fields)
        futures = Path(sysconfig.get_paths()["purelib"]) / "openprotein/jobs/futures.py"
        tree = ast.parse(futures.read_text())
        task = next(
            n
            for n in tree.body
            if isinstance(n, ast.ClassDef) and n.name == "TaskFuture"
        )
        self.assertFalse(
            any(
                isinstance(n, ast.AnnAssign)
                and isinstance(n.target, ast.Name)
                and n.target.id == "job"
                for n in task.body
            )
        )

    def test_fitted_model_links(self):
        for name in ("SVD", "UMAP", "GP"):
            with self.subTest(name=name):
                parts = self.entries[f"openprotein.jobs.{name}FitFuture"][
                    "bases_parts"
                ][0]
                self.assertIn(
                    {
                        "text": f"'{name}Model'",
                        "path": f"openprotein.models.{name}Model",
                        "page": "models",
                    },
                    parts,
                )

    def test_jobs_exports_structure_prediction_future(self):
        jobs = Path(sysconfig.get_paths()["purelib"]) / "openprotein/jobs/__init__.py"
        tree = ast.parse(jobs.read_text())
        self.assertTrue(
            any(
                isinstance(n, ast.ImportFrom)
                and n.module == "futures"
                and any(a.name == "StructurePredictionFuture" for a in n.names)
                for n in tree.body
            )
        )
