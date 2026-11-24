import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts/pyapi"))
import models_catalogue
from release_refresh import (
    BEHAVIORS,
    KERNELS,
    MOVES,
    NOTICE,
    measured_identity,
    schema,
)


def sample():
    paths = set(MOVES.values()) | {"openprotein.models." + n for n in KERNELS}
    paths.add("openprotein.models.StructurePredictionModel")
    return {
        "schema": 1,
        "repository": "https://github.com/OpenProteinAI/openprotein-python",
        "commit": "a" * 40,
        "branch": "release/v0.18.0",
        "version": None,
        "criterion27": {"releaseCommit": "a" * 40, "reportSha256": "b" * 64},
        "symbols": [
            {
                "public": p,
                "canonical": p,
                "file": "openprotein/fixture.py",
                "qualname": p.rsplit(".", 1)[1],
            }
            for p in sorted(paths)
        ],
        "removed": [
            "openprotein.models.ModelsJob",
            "openprotein.models.MODELS_JOB_TYPE",
        ],
        "private": [],
        "excluded": [
            "openprotein.search.MSASearchFuture",
            "openprotein.search.SearchJob",
            "openprotein.predictor.CVResults",
        ],
        "accessors": [
            {
                "name": "fixture_" + str(i),
                "modelId": "fixture-" + str(i),
                "interface": "openprotein.models.StructurePredictionModel",
                "aliasOf": None,
                "opendde": True,
            }
            for i in range(2)
        ],
        "kernels": ["openprotein.models." + n for n in KERNELS],
        "jobSchemas": [],
        "foldHelper": {"file": "openprotein/fixture.py", "qualname": "helper"},
        "behaviors": [
            {
                "id": name,
                "file": "openprotein/fixture.py",
                "qualname": "behavior",
                "contains": ["return None"],
            }
            for name in sorted(BEHAVIORS)
        ],
    }


SUPERSEDED_MODEL_CARDS = {
    f"openprotein.models.{name}"
    for name in {a.interface for a in models_catalogue.load_sdk_models().accessors}
    | {"SolubleMPNN"}
    if name
    not in {
        "Model",
        "ProteinLanguageModel",
        "StructurePredictionModel",
        "StructureGenerativeModel",
    }
} | {"openprotein.models.svd.SVDRecord"}


class HandoffSchemaTests(unittest.TestCase):
    def test_positive_fixture_is_declarative_only(self):
        self.assertEqual(schema(sample())["commit"], "a" * 40)

    def test_bad_identity_and_missing_source_contract_fail(self):
        changes = [
            {"commit": "develop"},
            {"commit": "5f2f775bc5d4f965677429d5aad269181c490c8f"},
            {"branch": "develop"},
            {"repository": "https://example.com/sdk"},
            {"version": ""},
            {"version": 18},
            {"extra": "command"},
            {"behaviors": []},
            {"kernels": []},
            {"removed": []},
            {"criterion27": {"releaseCommit": "c" * 40, "reportSha256": "b" * 64}},
        ]
        for change in changes:
            with self.subTest(change=change), self.assertRaises(ValueError):
                schema(sample() | change)

    def test_bad_rows_never_become_patches_or_wildcards(self):
        for kind in ("duplicate", "path", "command", "wildcard", "unknown-alias"):
            h = sample()
            if kind == "duplicate":
                h["symbols"].append(copy.deepcopy(h["symbols"][0]))
            elif kind == "path":
                h["symbols"][0]["file"] = "../outside.py"
            elif kind == "command":
                h["symbols"][0]["patch"] = "arbitrary code"
            elif kind == "wildcard":
                h["removed"].append("openprotein.models.*")
            else:
                h["accessors"][0]["aliasOf"] = "absent"
            with self.subTest(kind=kind), self.assertRaises(ValueError):
                schema(h)


class RefreshContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.h = schema(
            json.loads((ROOT / "scripts/pyapi/release-contract.json").read_text())
        )
        cls.manifest = json.loads((ROOT / "scripts/pyapi/pages.json").read_text())
        cls.pages = {p["page"]: p for p in cls.manifest["pages"]}
        cls.entries = {
            e["target"]: (p["page"], e)
            for p in cls.manifest["pages"]
            for s in p["sections"]
            for e in s["entries"]
        }
        cls.docs = [
            json.loads(p.read_text())
            for p in (ROOT / "specs").glob("openprotein*.json")
        ]
        cls.published = {
            e["path"]: e
            for d in cls.docs
            for e in d["entries"]
            if e.get("page") and not e.get("summary_only")
        }

    def prose(self, page):
        return "\n".join(s.get("prose") or "" for s in self.pages[page]["sections"])

    def test_eighteen_futures_and_domain_prompt_have_single_real_homes(self):
        self.assertEqual(
            sum(p.startswith("openprotein.jobs.") for p in MOVES.values()), 18
        )
        all_targets = [
            e["target"]
            for p in self.manifest["pages"]
            for s in p["sections"]
            for e in s["entries"]
        ]
        for old, new in MOVES.items():
            self.assertNotIn(old, self.entries)
            self.assertEqual(all_targets.count(new), 1)
            self.assertEqual(
                self.entries[new][0],
                "jobs" if new.startswith("openprotein.jobs.") else "data",
            )
            self.assertEqual(self.published[new]["page"], self.entries[new][0])
        for name in self.h["removed"] + self.h["private"] + self.h["excluded"]:
            self.assertNotIn(name, self.entries)
            self.assertNotIn(name, self.published)
        self.assertIn("openprotein.data.prompts.Prompt", self.entries)
        self.assertIn("openprotein.prompt.Prompt", self.entries)
        self.assertIn("list[list[str]]", self.prose("data"))
        for name in (
            "StructureGenerationFuture",
            "BoltzGenFuture",
            "RFdiffusionFuture",
        ):
            self.assertEqual(self.entries["openprotein.models." + name][0], "models")

    def test_results_fit_reload_and_kernels_are_public_guidance(self):
        self.assertIn("list[T]", self.prose("models"))
        self.assertIn("get(output=...)", self.prose("models"))
        for name in (
            "EmbeddingFuture",
            "StructureDesignFuture",
            "StructurePredictionFuture",
        ):
            self.assertIn(
                "/references/python-api/jobs#openprotein.jobs." + name,
                self.prose("models"),
            )
        for name in ("PredictorModel", "CVResultFuture", "Prompt"):
            self.assertIn(name, self.prose("jobs"))
        self.assertIn("#openprotein.jobs.Job", self.prose("jobs"))
        for target in self.h["kernels"]:
            self.assertEqual(self.entries[target][0], "models")
            self.assertNotIn(
                "openprotein.predictor." + target.rsplit(".", 1)[1], self.entries
            )
        self.assertIn(NOTICE, self.prose("embedding"))

    def test_definitions_and_legitimate_reexports_have_one_canonical_target(self):
        import shutil
        import sysconfig

        from generate import build_resolver
        from sdk import load_sdk

        canonical = {}
        for row in self.h["symbols"]:
            if row["public"] in self.entries:
                self.assertNotIn(
                    row["canonical"], canonical, "competing curated canonical targets"
                )
                canonical[row["canonical"]] = row["public"]
        package, shadow, _ = load_sdk(Path(sysconfig.get_paths()["purelib"]))
        try:
            resolve, _ = build_resolver(package, self.manifest)
            for row in self.h["symbols"]:
                if row["canonical"] in canonical:
                    target = canonical[row["canonical"]]
                    self.assertEqual(
                        resolve(row["public"]),
                        {"path": target, "page": self.entries[target][0]},
                    )
        finally:
            shutil.rmtree(shadow)

    def test_release_holdbacks_are_not_reintroduced(self):
        for row in self.h["excluded"]:
            self.assertNotIn(row, self.published)
        job = self.published["openprotein.jobs.Job"]
        for member in job.get("members", []):
            if member["name"] == "args":
                self.assertEqual(member["kind"], "property")
                self.assertTrue(member.get("source"))
                self.assertFalse(member.get("from_docstring"))
        svd = self.published["openprotein.models.SVDModel"]
        self.assertFalse(
            {"components", "update", "search"}.intersection(
                m["name"] for m in svd.get("members", [])
            )
        )
        gp = self.published["openprotein.models.GPModel"]
        crossvalidate = next(m for m in gp["members"] if m["name"] == "crossvalidate")
        self.assertRegex(crossvalidate["signature"], r"(?:\(|,\s*)folds\s*=")
        self.assertTrue(
            {
                "release-search-task-output",
                "prompt-content-reader",
                "gp-no-custom-folds",
                "svd-holdbacks",
            }
            <= {r["id"] for r in self.h["behaviors"]}
        )

    def test_reference_preserves_legacy_headings_and_selected_entries(self):
        # Exact pages.json bytes from docs commit 1b8c48fe3e8772d4ab33b6e1edc28c086bf9087e.
        baseline = json.loads(
            (ROOT / "scripts/pyapi/tests/fixtures/pages-1b8c48f.json").read_text()
        )
        for old_page in baseline["pages"]:
            current = self.pages[old_page["page"]]
            headings = [(s["heading"], s["level"]) for s in current["sections"]]
            old_headings = [(s["heading"], s["level"]) for s in old_page["sections"]]
            if old_page["page"] == "index":
                old_headings.remove(("Design", 2))
                old_headings.insert(
                    old_headings.index(("Models", 2)) + 1, ("Design", 2)
                )
                old_headings.insert(
                    old_headings.index(("Jobs", 2)) + 1, ("Clustering", 2)
                )
            elif old_page["page"] == "openprotein":
                old_headings.remove(("Clustering", 2))
            if old_page["page"] == "models":
                # Regrouped by base model: these headings were retired or re-levelled.
                restructured = {
                    ("PoET", 2),
                    ("Results", 4),
                }
                for heading in set(old_headings):
                    self.assertEqual(
                        headings.count(heading),
                        0 if heading in restructured else old_headings.count(heading),
                    )
            else:
                self.assertEqual(headings[: len(old_headings)], old_headings)
            for sec in old_page["sections"]:
                for entry in sec["entries"]:
                    name = entry["target"]
                    if name in {
                        "openprotein.ClusteringAPI",
                        "openprotein.clustering.HierarchicalClusteringFuture",
                        "openprotein.clustering.HierarchicalClusteringResult",
                        "openprotein.clustering.ClusteringMetadata",
                    }:
                        target = (
                            "openprotein.clustering.ClusteringAPI"
                            if name == "openprotein.ClusteringAPI"
                            else name
                        )
                        expected = copy.deepcopy(entry)
                        expected["target"] = target
                        if (
                            name
                            == "openprotein.clustering.HierarchicalClusteringFuture"
                        ):
                            expected["options"]["publish-members"] = ["get"]
                        self.assertEqual(self.entries[target], ("clustering", expected))
                    elif name in MOVES:
                        self.assertEqual(
                            self.entries[MOVES[name]][1]["options"], entry["options"]
                        )
                    elif name in SUPERSEDED_MODEL_CARDS:
                        continue
                    elif name not in self.h["removed"] + self.h["private"] + self.h[
                        "excluded"
                    ] and not any(
                        name == "openprotein.predictor." + k for k in KERNELS
                    ):
                        expected = copy.deepcopy(entry)
                        approved = {
                            "openprotein.molecules.Protein": [
                                "sequence",
                                "coordinates",
                                "plddt",
                                "cyclic",
                                "msa",
                                "templates",
                                "set_msa",
                                "set_templates",
                                "mask_sequence",
                                "mask_sequence_at",
                                "mask_structure",
                                "mask_structure_at",
                            ],
                            "openprotein.molecules.Complex": [
                                "name",
                                "templates",
                                "get_chain_ids",
                                "get_chains",
                                "get_chain",
                                "set_chain",
                                "insert_chain",
                            ],
                            "openprotein.molecules.Structure": [
                                "name",
                                "add_complex",
                                "to_string",
                                "from_string",
                                "from_filepath",
                            ],
                            "openprotein.design.DesignFuture": [
                                "get",
                                "wait",
                                "stream",
                            ],
                            "openprotein.design.schemas.DesignResult": [
                                "step",
                                "sample_index",
                                "sequence",
                                "scores",
                                "subscores",
                                "means",
                                "vars",
                            ],
                            "openprotein.jobs.UnitState": [
                                "PENDING",
                                "READY",
                                "RUNNING",
                                "SUCCESS",
                                "FAILED",
                                "CANCELED",
                            ],
                            "openprotein.jobs.JobOutput": [
                                "position",
                                "unit_id",
                                "value",
                            ],
                            "openprotein.common.FeatureType": ["PLM", "SVD"],
                            "openprotein.predictor.KernelType": [
                                "LINEAR",
                                "RBF",
                                "MATERN12",
                                "MATERN32",
                                "MATERN52",
                                "PERIODIC",
                                "RATIONAL_QUADRATIC",
                            ],
                            "openprotein.jobs.JobStatus": [
                                "CREATED",
                                "PENDING",
                                "RUNNING",
                                "SUCCESS",
                                "FAILURE",
                                "RETRYING",
                                "CANCELED",
                            ],
                        }
                        if name in approved:
                            expected["options"]["publish-members"] = approved[name]
                        additions = {
                            "openprotein.molecules.Protein": ["single_sequence_mode"],
                            "openprotein.molecules.Complex": [
                                "get_proteins",
                                "rmsd",
                                "from_filepath",
                            ],
                            "openprotein.jobs.Future": ["get"],
                            "openprotein.align.MSAFuture": ["get"],
                            "openprotein.prompt.Prompt": ["get"],
                        }
                        for legacy in (
                            "openprotein.embeddings.future.EmbeddingsScoreSingleSiteFuture",
                            "openprotein.embeddings.future.BaseScoreFuture",
                            "openprotein.embeddings.EmbeddingsResultFuture",
                            "openprotein.embeddings.EmbeddingsScoreFuture",
                            "openprotein.embeddings.EmbeddingsGenerateFuture",
                            "openprotein.fold.FoldResultFuture",
                            "openprotein.predictor.PredictionResultFuture",
                            "openprotein.predictor.validate.CVResultFuture",
                            "openprotein.models.StructureGenerationFuture",
                        ):
                            additions[legacy] = ["get"]
                        if name in additions:
                            expected["options"].setdefault(
                                "publish-members", []
                            ).extend(additions[name])
                        if name == "openprotein.jobs.Job":
                            expected["options"]["undoc-members"] = True
                        # Accessors of the catalogue's excluded models.
                        if name == "openprotein.models.ModelsAPI":
                            expected["options"]["exclude-members"] = self.entries[name][
                                1
                            ]["options"]["exclude-members"]
                        # The frozen baseline published params_schema, which the SDK now keeps private.
                        members = expected["options"].get("members")
                        if isinstance(members, list) and "params_schema" in members:
                            members.remove("params_schema")
                        self.assertEqual(
                            self.entries[name], (old_page["page"], expected)
                        )


class InstalledIdentityTests(unittest.TestCase):
    def test_observed_version_and_pep610_are_install_outputs(self):
        from types import SimpleNamespace

        h = sample()
        direct = {
            "url": h["repository"] + ".git",
            "vcs_info": {"vcs": "git", "commit_id": h["commit"]},
        }
        dist = SimpleNamespace(
            version="0.18.0.dev1+gabcdef0", read_text=lambda name: json.dumps(direct)
        )
        self.assertEqual(measured_identity(h, dist), (dist.version, direct))
        h["version"] = dist.version
        self.assertEqual(measured_identity(h, dist)[0], dist.version)

    def test_invalid_version_identity_and_missing_metadata_fail(self):
        from types import SimpleNamespace

        h = sample()
        good = {
            "url": h["repository"],
            "vcs_info": {"vcs": "git", "commit_id": h["commit"]},
        }
        cases = [
            ("fixture-only", good),
            ("", good),
            ("0.18.0", None),
            ("0.18.0", dict(good, url="https://example.com/sdk")),
            ("0.18.0", dict(good, vcs_info={"vcs": "git", "commit_id": "b" * 40})),
        ]
        for version, direct in cases:
            dist = SimpleNamespace(
                version=version,
                read_text=lambda name, direct=direct: json.dumps(direct),
            )
            with (
                self.subTest(version=version, direct=direct),
                self.assertRaises(ValueError),
            ):
                measured_identity(h, dist)
        h["version"] = "0.18.1"
        with self.assertRaises(ValueError):
            measured_identity(
                h,
                SimpleNamespace(
                    version="0.18.0", read_text=lambda name: json.dumps(good)
                ),
            )


if __name__ == "__main__":
    unittest.main()
