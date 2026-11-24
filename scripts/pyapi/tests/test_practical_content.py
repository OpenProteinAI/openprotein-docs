import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


class PracticalContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        pages = json.loads((ROOT / "scripts/pyapi/pages.json").read_text())["pages"]
        cls.prose = {
            page["page"]: "\n".join(s.get("prose") or "" for s in page["sections"])
            for page in pages
        }

        sections = {
            page["page"]: {s["heading"]: s.get("prose", "") for s in page["sections"]}
            for page in pages
            if page["page"] in {"models", "jobs"}
        }
        cls.models = sections["models"]
        cls.jobs = sections["jobs"]

    def test_index_connects_session_setup_to_task_examples(self):
        index = self.prose["index"]
        self.assertIn("session = openprotein.connect()", index)
        for target in (
            "openprotein#session",
            "models#interface",
            "models#esm2",
            "models#esmfold",
            "models#poet",
            "design#criteria",
        ):
            with self.subTest(target=target):
                self.assertIn(f"(/references/python-api/{target})", index)

    def test_models_interface_starts_with_one_embedding_workflow(self):
        text = self.models["Interface"]
        self.assertEqual(text.count("```python"), 1)
        for value in (
            "session.models.esm2",
            "model.embed(",
            "job.wait(timeout=600)[0]",
            "embedding.shape",
            "(#task-results)",
            "(/references/python-api/jobs)",
        ):
            self.assertIn(value, text)
        self.assertIn("session.jobs.get(", self.prose["jobs"])
        self.assertIn("model.fold(", self.models["ESMFold"])

    def test_the_future_table_is_under_task_results(self):
        self.assertIn("| Future | Primary output |", self.models["Task results"])
        self.assertNotIn("| Future | Primary output |", self.models[None])

    def test_fitted_model_examples_fit_and_use_each_estimator(self):
        text = self.models["Fitted models"]
        self.assertIn("session.models.esm2.embed(assay,", text)
        self.assertIn("projections[0].shape", text)
        self.assertIn("coordinates[0].shape", text)
        self.assertIn("predictions[0][measurement]", text)
        self.assertIn('first_prediction["mean"], first_prediction["variance"]', text)
        for name, method in (
            ("SVD", "transform"),
            ("UMAP", "transform"),
            ("GP", "predict"),
        ):
            with self.subTest(estimator=name):
                handle = name.lower()
                start = text.index(f"{handle}_fit = session.models.{name}(")
                code = text[start : text.index("```", start)]
                self.assertIn(".fit(embedding_job", code)
                self.assertIn(f"{handle} = {handle}_fit.wait()", code)
                self.assertIn(f"{handle}.{method}(new_sequences).wait()", code)

    def test_assay_upload_links_to_session_setup(self):
        self.assertIn(
            "(/references/python-api/openprotein#session)", self.prose["data"]
        )

    def test_design_criteria_constraint_and_gp_bridge(self):
        text = self.prose["design"]
        for value in (
            "(/references/python-api/data)",
            "measured `activity` values",
            "fit.wait(",
            "ModelCriterion(",
            "measurement_name=",
            "DesignConstraint(",
            "constraints.allow(",
            "create_genetic_algorithm_design(",
            "result.sequence",
            "GPModel",
            "PredictorModel",
        ):
            self.assertIn(value, text)

    def test_clustering_rules_and_input_examples(self):
        text = self.prose["clustering"]
        for value in (
            "10,000",
            "feature_type",
            "reduction",
            "euclidean",
            "session.clustering.hierarchical(",
            "session.embedding",
            "assay=assay",
            "sequences=sequences",
            "result.leaf_order",
        ):
            self.assertIn(value, text)

    def test_stored_alignment_sample_reads_prompt_replicates(self):
        for value in (
            "session.data.msa.get(",
            "session.data.prompts.sample_msa(",
            "max_msa_sequences=10",
            "groups = prompt_job.wait(timeout=600)",
            "for group in groups:",
        ):
            self.assertIn(value, self.prose["data"])
        self.assertIn(
            "(/references/python-api/data#alignments-and-sampled-prompts)",
            self.prose["prompt"],
        )

    def test_jobs_errors_and_navigation(self):
        text = self.prose["jobs"]
        for value in (
            "JobFailedException",
            "TimeoutException",
            "AuthError",
            "JobStatus.SUCCESS",
            "wait_until_done",
        ):
            self.assertIn(value, text)
        self.assertIn("/references/python-api/models", self.prose["prompt"])
        self.assertIn("session.models", self.prose["index"])

    def test_task_results_shows_three_reads_of_the_same_job(self):
        text = self.jobs["Task results"]
        for value in (
            "(/references/python-api/models#interface)",
            "job.wait(timeout=600)",
            "job.unit(0).wait(timeout=600)",
            "job.outputs",
            'job.wait(output="embeddings", timeout=600)',
        ):
            with self.subTest(value=value):
                self.assertIn(value, text)
        self.assertIn(
            "(/references/python-api/jobs#task-results)", self.models["Task results"]
        )

    def test_workflow_examples_parse_as_python(self):
        import ast
        import re

        for page in (
            "index",
            "models",
            "data",
            "jobs",
            "design",
            "clustering",
            "align",
            "prompt",
        ):
            blocks = re.findall(r"```python\n(.*?)\n```", self.prose[page], re.DOTALL)
            self.assertTrue(blocks, page)
            for block in blocks:
                with self.subTest(page=page, block=block[:50]):
                    ast.parse(block)
