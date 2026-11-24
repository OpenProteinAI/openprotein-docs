import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
EXPORTED = [
    "AbLang2",
    "AlphaFold2",
    "AttentionFuture",
    "Boltz1",
    "Boltz2",
    "BoltzGen",
    "BoltzGenFuture",
    "CrossvalidateFuture",
    "CrossvalidateResults",
    "ESM1",
    "ESM2",
    "ESMC",
    "ESMFold",
    "ESMFold2",
    "ESMIF1",
    "EmbeddingFuture",
    "FutureUnit",
    "GP",
    "GPFitFuture",
    "GPModel",
    "IndelScoreFuture",
    "LinearKernel",
    "LogLikelihoodFuture",
    "LogitsFuture",
    "Matern12Kernel",
    "Matern32Kernel",
    "Matern52Kernel",
    "MethodDescriptor",
    "MiniFold",
    "Model",
    "ModelDescription",
    "ModelMetadata",
    "ModelsAPI",
    "OpenDDE",
    "PeriodicKernel",
    "PoET",
    "PoET2",
    "PredictionFuture",
    "ProtSeq",
    "ProtT5",
    "ProteinLanguageModel",
    "ProteinMPNN",
    "Protenix",
    "ProtenixV2",
    "RBFKernel",
    "RFdiffusion",
    "RFdiffusionFuture",
    "RationalQuadraticKernel",
    "RosettaFold3",
    "RotaProt",
    "SVD",
    "SVDFitFuture",
    "SVDModel",
    "SequenceGenerationFuture",
    "SingleSitePredictionFuture",
    "SingleSiteScoreFuture",
    "StructureDesignFuture",
    "StructureGenerationFuture",
    "StructureGenerationJob",
    "StructureGenerativeModel",
    "StructurePredictionFuture",
    "StructurePredictionModel",
    "TaskFuture",
    "TrainedKernel",
    "UMAP",
    "UMAPFitFuture",
    "UMAPModel",
]
API_MEMBERS = [
    "GP",
    "SVD",
    "UMAP",
    "ablang2",
    "af2",
    "alphafold2",
    "boltz1",
    "boltz1x",
    "boltz2",
    "boltz_1",
    "boltz_1x",
    "boltz_2",
    "boltzgen",
    "esm1b",
    "esm1b_t33_650M_UR50S",
    "esm1v",
    "esm1v_t33_650M_UR90S_1",
    "esm1v_t33_650M_UR90S_2",
    "esm1v_t33_650M_UR90S_3",
    "esm1v_t33_650M_UR90S_4",
    "esm1v_t33_650M_UR90S_5",
    "esm2",
    "esm2_t12_35M_UR50D",
    "esm2_t30_150M_UR50D",
    "esm2_t33_650M_UR50D",
    "esm2_t36_3B_UR50D",
    "esm2_t6_8M_UR50D",
    "esm_if1",
    "esmc_300m",
    "esmc_600m",
    "esmc_6b",
    "esmfold",
    "esmfold2",
    "esmfold2_fast",
    "esmif1",
    "minifold",
    "opendde",
    "opendde_abag",
    "poet",
    "poet2",
    "poet_2",
    "prot_seq",
    "proteinmpnn",
    "protenix",
    "protenix_v2",
    "prott5_xl",
    "rf3",
    "rfdiffusion",
    "rosettafold_3",
    "rotaprot_large_uniref50w",
    "rotaprot_large_uniref90_ft",
    "solublempnn",
    "list_models",
    "get_model",
]
SCHEMAS = {
    "openprotein.models.ModelMetadata": "model_id type family_id model name variant is_system base tags input_types description dimension query multichain methods max_sequence_length owner created_at spec",
    "openprotein.models.MethodDescriptor": "path outputs description name default_output",
    "openprotein.models.ModelDescription": "summary citation_title doi",
    "openprotein.models.svd.SVDEmbeddingSource": "model_id version reduction prompt_id",
}
FUTURES = {
    "EmbeddingFuture": "embeddings",
    "LogitsFuture": "logits",
    "AttentionFuture": "attn",
    "LogLikelihoodFuture": "loglikelihood",
    "SingleSiteScoreFuture": "score",
    "IndelScoreFuture": "score",
    "SequenceGenerationFuture": "sequences",
    "PredictionFuture": "predictions",
    "SingleSitePredictionFuture": "predictions",
    "StructureDesignFuture": "structures",
    "StructurePredictionFuture": "structures",
}


def read_json(path):
    return json.loads((ROOT / path).read_text())


KERNEL_PATHS = {
    "TrainedKernel": "openprotein.models.TrainedKernel",
    "LinearKernel": "openprotein.models.LinearKernel",
    "RBFKernel": "openprotein.models.RBFKernel",
    "Matern12Kernel": "openprotein.models.Matern12Kernel",
    "Matern32Kernel": "openprotein.models.Matern32Kernel",
    "Matern52Kernel": "openprotein.models.Matern52Kernel",
    "PeriodicKernel": "openprotein.models.PeriodicKernel",
    "RationalQuadraticKernel": "openprotein.models.RationalQuadraticKernel",
}


def public_path(name):
    if name in KERNEL_PATHS:
        return KERNEL_PATHS[name]
    jobs = [
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
        "SVDFitFuture",
        "UMAPFitFuture",
        "GPFitFuture",
        "CrossvalidateFuture",
        "FitFuture",
        "CrossvalidateResults",
    ]
    return ("openprotein.jobs." if name in jobs else "openprotein.models.") + name


class ReferenceContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = read_json("scripts/pyapi/pages.json")
        cls.pages = {page["page"]: page for page in cls.manifest["pages"]}
        cls.documents = [
            json.loads(path.read_text())
            for path in sorted((ROOT / "specs").glob("openprotein*.json"))
        ]
        cls.entries = {
            entry["path"]: entry
            for doc in cls.documents
            for entry in doc["entries"]
            if entry.get("page") and not entry.get("summary_only")
        }
        cls.published = {entry["path"]: entry["page"] for entry in cls.entries.values()}
        for entry in cls.entries.values():
            cls.published.update(
                {
                    entry["path"] + "." + member["name"]: entry["page"]
                    for member in entry.get("members", [])
                }
            )
        cls.prose = "\n".join(
            section.get("prose") or "" for section in cls.pages["models"]["sections"]
        )

    def members(self, path):
        return {
            member["name"]: member for member in self.entries[path].get("members", [])
        }

    def test_canonical_model_exports_have_homes(self):
        for name in EXPORTED:
            with self.subTest(name=name):
                self.assertEqual(
                    self.published.get(public_path(name)),
                    "jobs"
                    if public_path(name).startswith("openprotein.jobs.")
                    else "models",
                )

    def test_params_schema_is_nowhere_in_the_published_reference(self):
        texts = {"pages.json": (ROOT / "scripts/pyapi/pages.json").read_text()}
        for path in (ROOT / "specs").glob("openprotein*.json"):
            texts[path.name] = path.read_text()
        for name, text in texts.items():
            self.assertNotIn("params_schema", text, name)

    def test_discovery_exposes_the_declared_interface(self):
        self.assertEqual(
            set(self.members("openprotein.models.ModelsAPI")), set(API_MEMBERS)
        )
        intro = self.pages["models"]["sections"][0]["prose"]
        for call in (
            "session.models.esm2",
            "session.models.list_models()",
            "session.models.get_model(",
        ):
            self.assertIn(call, intro)
        self.assertNotIn("WIP interface", self.prose)

    def test_metadata_fields_have_documentation(self):
        for path, fields in SCHEMAS.items():
            with self.subTest(path=path):
                members = self.members(path)
                for name in fields.split():
                    self.assertIn(name, members)
                    self.assertTrue(
                        (members[name].get("doc") or "").strip(), path + "." + name
                    )

    def test_specialized_reads_and_provenance_are_visible(self):
        required = {
            "get",
            "wait",
            "get_item",
            "stream",
            "unit",
            "iter_units",
            "args",
            "dataset",
            "version",
            "units",
            "outputs",
            "job",
            "status",
        }
        for name, output in FUTURES.items():
            with self.subTest(future=name):
                entry = self.entries[public_path(name)]
                self.assertTrue(required <= self.members(entry["path"]).keys())
                self.assertIn(output, entry.get("doc") or "")
                self.assertIn("#" + public_path(name), self.prose)
        self.assertIn("list[T]", self.prose)
        self.assertIn("stream()", self.prose)
        self.assertIn("own result type", self.prose)
        self.assertIn("#openprotein.molecules.Structure", self.prose)
        self.assertIn("#openprotein.molecules.Complex", self.prose)

    def test_fitted_models_expose_supported_operations(self):
        requirements = {
            "GPModel": {
                "spec",
                "predict",
                "single_site",
                "crossvalidate",
                "evaluations",
                "training",
                "delete",
            },
            "SVDModel": {
                "embedding",
                "requested_n_components",
                "n_components",
                "embed",
                "transform",
                "fit_gp",
                "fit_umap",
                "delete",
            },
            "UMAPModel": {"spec", "embed", "transform", "delete"},
            "SVDFitFuture": {"get", "wait", "embed", "transform"},
            "UMAPFitFuture": {"get", "wait", "embed", "transform"},
            "GPFitFuture": {"get", "wait"},
        }
        for name, expected in requirements.items():
            with self.subTest(model=name):
                self.assertTrue(expected <= self.members(public_path(name)).keys())
        self.assertIn(
            "Use `get(output=...)` or `wait(output=...)` to select a named output",
            self.prose,
        )
        self.assertNotIn("Explicit named outputs return their values.", self.prose)
        for path in (
            "openprotein.jobs.FitFuture",
            "openprotein.jobs.SVDFitFuture",
            "openprotein.jobs.UMAPFitFuture",
            "openprotein.jobs.GPFitFuture",
        ):
            for operation in ("get", "wait"):
                member = self.members(path)[operation]
                self.assertIn(
                    "output=None", member["signature"], path + "." + operation
                )
                self.assertEqual(
                    len(member.get("overloads") or []), 2, path + "." + operation
                )
                self.assertIn("named output", member["doc"])

    def test_retirements_match_exact_historical_absences(self):
        historical = set()
        for file in (ROOT / "scripts/pyapi/golden").glob("*.json"):
            golden = json.loads(file.read_text())
            for entry in golden["classes"]:
                historical.add((file.stem, entry["path"]))
                historical.update(
                    (file.stem, member["path"]) for member in entry["members"]
                )
            historical.update(
                (file.stem, member["id"]) for member in golden["module_level"]
            )
        baseline = read_json("scripts/pyapi/deployed-anchors.json")
        self.assertEqual(len(baseline["anchors"]), 1737)
        historical.update(tuple(row) for row in baseline["anchors"])
        missing = {
            (page, path)
            for page, path in historical
            if self.published.get(path) != page
        }
        records = read_json("scripts/pyapi/anchor-retirements.json")
        import hashlib

        self.assertEqual(
            hashlib.sha256(
                json.dumps(records[:20], sort_keys=True).encode()
            ).hexdigest(),
            "97d323c3f48e23b45dcd0b136f4f05be4e575381ebb5291fba45cb084376e432",
        )
        pairs = [(record["page"], record["anchor"]) for record in records]
        self.assertEqual(len(set(pairs)), len(pairs))
        self.assertEqual(set(pairs), missing)
        removed_anchors = {
            "openprotein.models.ProteinMPNNModel.indel",
            "openprotein.models.ESMIF1Model.indel",
        }
        for record in records[:20]:
            self.assertTrue(record["reason"].strip())
            if record["anchor"] in removed_anchors:
                self.assertIs(record["removed"], True)
                continue
            target = record["replacement"]
            self.assertEqual(self.published.get(target["anchor"]), target["page"])
            if record["anchor"].endswith(".get_metadata"):
                self.assertTrue(target["anchor"].endswith(".metadata"))
            if record["anchor"].endswith(".predict"):
                self.assertTrue(target["anchor"].endswith(".generate"))

    def test_deployed_absence_and_page_move_fail_offline(self):
        path = "openprotein.models.ModelsAPI.SVD"
        baseline = read_json("scripts/pyapi/deployed-anchors.json")
        self.assertIn(["models", path], baseline["anchors"])
        original = self.published
        try:
            for moved in (False, True):
                with self.subTest(moved=moved):
                    self.published = dict(original)
                    if moved:
                        self.published[path] = "embedding"
                    else:
                        del self.published[path]
                    with self.assertRaisesRegex(AssertionError, path):
                        self.test_retirements_match_exact_historical_absences()
        finally:
            self.published = original

    def test_current_names_and_release_scope(self):
        removed = [
            "PLM",
            "StructurePredictor",
            "RFdiffusionModel",
            "BoltzGenModel",
            "ProteinMPNNModel",
            "SolubleMPNNModel",
            "ESMIF1Model",
        ]
        for name in removed:
            self.assertNotIn(public_path(name), self.entries)
        svd = self.members("openprotein.models.SVDModel")
        self.assertNotIn("components", svd)
        self.assertNotIn("update", svd)
        self.assertNotIn("search", svd)
        api = self.members("openprotein.models.ModelsAPI")
        models_api = next(
            e
            for section in self.pages["models"]["sections"]
            for e in section["entries"]
            if e["target"] == "openprotein.models.ModelsAPI"
        )
        self.assertFalse(set(api) & set(models_api["options"]["exclude-members"]))

    def test_unit_fields_and_distinct_prompt_results(self):
        self.assertEqual(
            set(self.members("openprotein.jobs.Unit")),
            {"position", "unit_id", "state", "error"},
        )
        future_unit = self.members("openprotein.jobs.FutureUnit")
        self.assertTrue(
            {"job_id", "position", "output", "unit_id", "status", "done", "get", "wait"}
            <= future_unit.keys()
        )
        sampled = self.members("openprotein.data.prompts.PromptFuture")["get"]
        self.assertEqual(sampled["returns"].replace(" ", ""), "list[list[str]]")
        self.assertIn("openprotein.data.prompts.Prompt", self.entries)
        self.assertIn("openprotein.prompt.Prompt", self.entries)
        data_prose = "\n".join(
            section.get("prose") or "" for section in self.pages["data"]["sections"]
        )
        self.assertIn("#openprotein.data.prompts.Prompt", data_prose)
        self.assertIn(
            "/references/python-api/prompt#openprotein.prompt.Prompt", data_prose
        )

    def test_page_structure_preserves_real_headings(self):
        self.assertEqual(len(self.pages), 13)
        primitives = next(
            section
            for section in self.pages["index"]["sections"]
            if section.get("heading") == "Data primitives"
        )
        self.assertEqual(primitives["summarises"], "molecules")
        headings = [
            section.get("heading") for section in self.pages["models"]["sections"]
        ]
        self.assertEqual(headings.count("Results"), 0)
        self.assertEqual(headings.count("Deprecated results"), 1)
        for heading in [
            "Models",
            "RFdiffusion",
            "ProteinMPNN",
            "ESM-IF1",
            "BoltzGen",
            "ESM2",
            "Shared types",
        ]:
            self.assertIn(heading, headings)
        rendered = (ROOT / "content/docs/references/python-api/models.mdx").read_text()
        self.assertIn('id="results" title="Deprecated results"', rendered)
        self.assertNotIn('id="results-1"', rendered)
        self.assertIn('id="shared-types"', rendered)

    def test_release_source_published_annotations_and_docs(self):
        self.assertNotIn("openprotein.align.api.prompt_post", self.entries)
        protein_msa = self.members("openprotein.molecules.Protein")["msa"]
        self.assertTrue(
            any(
                part.get("path") == "openprotein.data.MSA"
                for part in protein_msa["annotation_parts"]
            )
        )
        prompt_msa = self.members("openprotein.prompt.PromptJob")["msa_id"]
        self.assertIn("None", prompt_msa["annotation"])
        self.assertIn("None", prompt_msa["doc"])

    def test_source_provenance_matches_its_declared_mode(self):
        pin = read_json("scripts/pyapi/sdk-pin.json")
        self.assertRegex(pin["commit"], r"^[a-f0-9]{40}$")
        for document in self.documents:
            self.assertEqual(document["source"]["ref"], pin["commit"])
            self.assertEqual(document["sdk"]["version"], pin["version"])
            self.assertEqual(
                document["source"]["repository"],
                pin.get(
                    "repository", "https://github.com/OpenProteinAI/openprotein-python"
                ),
            )
            if pin.get("branch"):
                self.assertEqual(document["source"]["branch"], pin["branch"])
                self.assertNotIn("tag", document["source"])
            else:
                self.assertEqual(document["source"]["tag"], "v" + pin["version"])
                self.assertNotIn("branch", document["source"])

    def test_gp_hyperparameters_and_kernel_types(self):
        for path in (
            "openprotein.models.GPModel",
            "openprotein.predictor.PredictorModel",
        ):
            members = self.members(path)
            for name in ("kernel", "mean", "noise"):
                self.assertIn(name, members, path)
                self.assertTrue((members[name].get("doc") or "").strip())
            self.assertIn("units of the trained property", members["mean"]["doc"])
            self.assertIn("squared", members["noise"]["doc"])
            self.assertIn(
                {
                    "text": "TrainedKernel",
                    "path": "openprotein.models.TrainedKernel",
                    "page": "models",
                },
                members["kernel"]["annotation_parts"],
            )
            self.assertIn(
                "before hyperparameters were recorded", members["kernel"]["doc"]
            )
        self.assertIn(
            "ensemble",
            self.members("openprotein.predictor.PredictorModel")["kernel"]["doc"],
        )
        for name in (
            "TrainedKernel",
            "LinearKernel",
            "RBFKernel",
            "Matern12Kernel",
            "Matern32Kernel",
            "Matern52Kernel",
            "PeriodicKernel",
            "RationalQuadraticKernel",
        ):
            path = KERNEL_PATHS[name]
            self.assertEqual(self.published[path], "models")
            members = self.members(path)
            self.assertNotIn("model_config", members)
            expected = {"outputscale"}
            if name not in ("TrainedKernel", "LinearKernel"):
                expected.add("lengthscale")
            if name == "PeriodicKernel":
                expected.add("period")
            if name == "RationalQuadraticKernel":
                expected.add("alpha")
            for field in expected:
                self.assertIn(field, members, path)
                self.assertTrue(
                    (members[field].get("doc") or "").strip(), path + "." + field
                )
            if "type" in members:
                self.assertIn("ClassVar", members["type"].get("annotation") or "")


if __name__ == "__main__":
    unittest.main()
