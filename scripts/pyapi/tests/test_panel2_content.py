import ast
import json
import sysconfig
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


class Panel2ContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pages = {
            page["page"]: page
            for page in json.loads((ROOT / "scripts/pyapi/pages.json").read_text())[
                "pages"
            ]
        }
        cls.entries = {
            entry["path"]: entry
            for path in (ROOT / "specs").glob("openprotein*.json")
            for entry in json.loads(path.read_text())["entries"]
        }

    def prose(self, page, heading):
        return next(
            section.get("prose", "")
            for section in self.pages[page]["sections"]
            if section.get("heading") == heading
        )

    def test_workflow_bridges_and_compatibility(self):
        align = self.prose("align", None)
        for value in (
            "msa = session.align.create_msa(sequence)",
            "for name, aligned_sequence in islice(msa.wait(timeout=600), 3):",
            "protein.msa = msa",
            "Protein.single_sequence_mode",
            "num_sequences",
            "max_msa_sequences",
        ):
            self.assertIn(value, align)
        prompt = self.prose("prompt", None)
        for value in (
            "stored Data `Prompt`",
            "prompt=prompt",
            "/references/python-api/models#openprotein.models.PoET",
        ):
            self.assertIn(value, prompt)
        for heading in ("Foundation models", "Predictor", "Fold"):
            self.assertIn("deprecated", self.prose("index", heading))
        self.assertIn("exactly one", self.prose("molecules", "Ligand"))
        self.assertIn("1-based", self.prose("design", "Results"))
        models = self.prose("models", "Model interfaces")
        self.assertIn("(/references/rest-api/models)", models)
        self.assertIn("Python keyword arguments can differ", models)
        self.assertIn("advertised methods", self.prose("models", "Fitted models"))

    def test_pinned_error_paths_match_job_guidance(self):
        sdk = Path(sysconfig.get_paths()["purelib"]) / "openprotein/jobs"
        api = ast.parse((sdk / "_api.py").read_text())
        functions = {
            n.name: n
            for n in api.body
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
        }
        page = ast.unparse(functions["job_output_page"])
        position = ast.unparse(functions["job_output_get"])
        self.assertIn("JobOutputsNotReady", page)
        self.assertIn("409", page)
        self.assertIn("session.get", position)
        self.assertNotIn("JobOutputsNotReady", position)
        futures = ast.parse((sdk / "futures.py").read_text())
        unit = next(
            n
            for n in futures.body
            if isinstance(n, ast.ClassDef) and n.name == "FutureUnit"
        )
        methods = {
            n.name: ast.unparse(n) for n in unit.body if isinstance(n, ast.FunctionDef)
        }
        self.assertIn("get_item", methods["get"])
        for operation in ("get", "wait"):
            self.assertIn("self._raise_if_unsuccessful()", methods[operation])
        check = methods["_raise_if_unsuccessful"]
        for token in ("JobFailedException", "JobStatus.FAILURE", "JobStatus.CANCELED"):
            self.assertIn(token, check)

    def test_error_and_member_publication(self):
        for name in (
            "AuthError",
            "JobFailedException",
            "JobOutputsNotReady",
            "InvalidJob",
            "NotPrepared",
        ):
            self.assertIn("openprotein.errors." + name, self.entries)
        for path, members in {
            "openprotein.jobs.Future": ["get"],
            "openprotein.align.MSAFuture": ["get"],
            "openprotein.prompt.Prompt": ["get"],
            "openprotein.molecules.Protein": ["single_sequence_mode"],
            "openprotein.molecules.Complex": ["get_proteins", "rmsd", "from_filepath"],
            "openprotein.models.ProteinMPNN": ["embed"],
            "openprotein.fold.FoldResultFuture": ["get"],
        }.items():
            published = {member["name"] for member in self.entries[path]["members"]}
            self.assertTrue(set(members) <= published, path)
        jobs = self.prose("jobs", None)
        for value in (
            "JobOutputsNotReady",
            "terminal status",
            "`FutureUnit.get()` and `FutureUnit.wait()` raise `JobFailedException`",
            "a direct position read can instead raise `HTTPError`",
        ):
            self.assertIn(value, jobs)


if __name__ == "__main__":
    unittest.main()
