import ast
import contextlib
import io
import json
import re
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / "scripts/pyapi"))
import model_examples as me
import models_catalogue as mc

BLOCK = re.compile(r"```python\n(.*?)\n```", re.DOTALL)
EXPECTED_VERBS = {
    "batch/embeddings": "embed",
    "batch/logits": "logits",
    "batch/attn": "attn",
    "batch/loglikelihood": "score",
    "single-site/scores": "single_site",
    "indel/scores": "indel",
    "generate/sequences": "generate",
    "generate/structures": "generate",
}

SDK = mc.load_sdk_models()
CLASSES = me.load_sdk_classes()
ACCESSORS = {a.name: a.interface for a in SDK.accessors}
METHODS = json.loads(mc.METHODS_FIXTURE.read_text())
EXAMPLES = mc.read_json(mc.CURATION)["examples"]
BASE_ORDER = json.loads(mc.BASE_ORDER_FIXTURE.read_text())


def models_page_sections():
    pages = json.loads(mc.PAGES.read_text())
    page = next(p for p in pages["pages"] if p["page"] == "models")
    return page["sections"]


def sections():
    return {s["heading"]: s for s in models_page_sections() if s.get("nested")}


def block_of(section):
    found = BLOCK.findall(section["prose"])
    return "```python\n" + found[0] + "\n```" if found else None


def default_verb(path, cls):
    mapped, _ = me.map_paths(CLASSES, cls, [path])
    return mapped.get(path)


class ExampleInventoryTests(unittest.TestCase):
    def test_every_base_section_has_one_block_with_a_snippet_per_advertised_path(self):
        for base in BASE_ORDER:
            with self.subTest(base=base["model"]):
                section = sections()[base["model"]]
                self.assertEqual(len(BLOCK.findall(section["prose"])), 1)
                paths = METHODS[base["models"][0]]
                cls = ACCESSORS[mc.default_accessor(SDK, base["models"][0])]
                mapped, unmapped = me.map_paths(CLASSES, cls, paths)
                self.assertEqual(unmapped, [])
                problems = me.verify_block(
                    block_of(section), CLASSES, ACCESSORS, mapped
                )
                self.assertEqual(problems, [])

    def test_examples_read_array_and_molecular_results(self):
        models = sections()
        esm2 = block_of(models["ESM2"])
        self.assertIn("reduction=None", esm2)
        self.assertIn("embedding.shape", esm2)
        self.assertIn("tokens (including special tokens)", esm2)
        for name in ("ESMFold", "BoltzGen"):
            with self.subTest(model=name):
                block = block_of(models[name])
                self.assertIn("job.wait()[0]", block)
                self.assertIn("chain.sequence.decode()", block)
                self.assertIn("chain.coordinates.shape", block)

    def test_models_page_examples_use_python_methods_without_route_names(self):
        paths = {path for methods in METHODS.values() for path in methods}
        for section in models_page_sections():
            for code in BLOCK.findall(section.get("prose", "")):
                with self.subTest(section=section["heading"]):
                    self.assertEqual({path for path in paths if path in code}, set())

    def test_models_in_a_section_share_one_class_and_one_method_list(self):
        for base in BASE_ORDER:
            ids = base["models"]
            self.assertEqual(
                {tuple(METHODS[i]) for i in ids}, {tuple(METHODS[ids[0]])}, base
            )
            self.assertEqual(
                {mc.interface_of(SDK, i) for i in ids}, {mc.interface_of(SDK, ids[0])}
            )

    def test_the_default_accessor_is_the_sections_first_model_and_class_default(self):
        for base in BASE_ORDER:
            accessor = mc.default_accessor(SDK, base["models"][0])
            cls = ACCESSORS[accessor]
            self.assertIn(
                f"model = session.models.{accessor}\n",
                block_of(sections()[base["model"]]),
            )
            default = me.default_checkpoint(CLASSES, cls)
            self.assertEqual(default, base["models"][0], base["model"])

    def test_path_to_verb_mapping_is_read_from_the_sdk(self):
        for base in BASE_ORDER:
            cls = mc.interface_of(SDK, base["models"][0])
            for path in METHODS[base["models"][0]]:
                verb = default_verb(path, cls)
                if path in EXPECTED_VERBS:
                    self.assertEqual(verb, EXPECTED_VERBS[path], (cls, path))
                elif path == "batch/structures":
                    self.assertEqual(verb, "fold", cls)
                else:
                    self.fail(f"unmapped path {path} on {cls}")

    def test_no_advertised_path_lacks_a_verb(self):
        unmapped = {
            base["model"]: me.map_paths(
                CLASSES,
                mc.interface_of(SDK, base["models"][0]),
                METHODS[base["models"][0]],
            )[1]
            for base in BASE_ORDER
        }
        self.assertEqual({k: v for k, v in unmapped.items() if v}, {})

    def test_a_verb_the_card_does_not_advertise_is_not_shown(self):
        esm2 = block_of(sections()["ESM2"])
        for verb in ("indel", "score", "generate", "fold"):
            self.assertNotIn(f"model.{verb}(", esm2)
        mpnn = block_of(sections()["ProteinMPNN"])
        self.assertNotIn("model.indel(", mpnn)
        self.assertNotIn("model.attn(", block_of(sections()["PoET"]))
        self.assertIn("model.attn(", block_of(sections()["PoET-2"]))

    def test_an_unmapped_path_is_reported_not_invented(self):
        mapped, unmapped = me.map_paths(
            CLASSES, "ESM2", ["batch/embeddings", "weird/path"]
        )
        self.assertEqual(mapped, {"batch/embeddings": "embed"})
        self.assertEqual(unmapped, ["weird/path"])
        block, _, left = me.render_examples(
            CLASSES, "ESM2", "esm2", ["weird/path"], EXAMPLES
        )
        self.assertEqual((block, left), ("", ["weird/path"]))
        base = next(b for b in BASE_ORDER if b["model"] == "ESM2")
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            section = mc.render_base_section(
                base,
                {},
                {},
                {},
                SDK,
                mc.SdkSource(CLASSES, {i: ["weird/path"] for i in base["models"]}),
                EXAMPLES,
                ["ESM2"],
            )
        self.assertEqual(stderr.getvalue().strip(), "ESM2: no SDK verb for weird/path")
        self.assertIsNone(block_of(section))

    def test_override_keys_name_real_sdk_classes(self):
        self.assertLessEqual(me.example_class_names(EXAMPLES), set(CLASSES.classes))

    def test_msa_fold_inputs_follow_the_sdk(self):
        for needs in (
            "AlphaFold2",
            "Boltz-2",
            "Boltz-1",
            "RosettaFold-3",
            "OpenDDE",
            "Protenix",
            "Protenix-v2",
            "ESMFold2",
        ):
            self.assertIn(
                "protein.msa = session.align.create_msa(",
                block_of(sections()[needs]),
                needs,
            )
        for single in ("ESMFold", "MiniFold"):
            self.assertNotIn("msa", block_of(sections()[single]), single)

    def test_card_members_are_the_advertised_verbs(self):
        for base in BASE_ORDER:
            for entry in sections()[base["model"]]["entries"]:
                if entry["target"].endswith("Input"):
                    continue
                cls = entry["target"].rsplit(".", 1)[1]
                paths = METHODS[base["models"][0]]
                mapped, _ = me.map_paths(CLASSES, cls, paths)
                members = entry["options"]["members"]
                self.assertEqual(members[:2], ["metadata", "methods"])
                self.assertEqual(
                    [m for m in members if m in set(mapped.values())],
                    [mapped[p] for p in paths],
                )


EMBED_ONLY = {"batch/embeddings": "embed"}


class VerificationControlTests(unittest.TestCase):
    GOOD = (
        "```python\n"
        "model = session.models.esm2\n\n"
        'job = model.embed(["MKT"], reduction="MEAN")\n'
        "embeddings = job.wait()\n"
        "```"
    )

    def check(self, code, expected=None):
        return me.verify_block(code, CLASSES, ACCESSORS, expected)

    def test_a_correct_block_passes(self):
        self.assertEqual(self.check(self.GOOD, EMBED_ONLY), [])

    def test_a_block_that_does_not_parse_fails(self):
        self.assertTrue(
            self.check("```python\nmodel = (\n```")[0].startswith("does not parse")
        )

    def test_a_wrong_accessor_fails(self):
        bad = self.GOOD.replace("session.models.esm2", "session.models.nope")
        self.assertEqual(self.check(bad), ["ModelsAPI has no accessor nope"])

    def test_an_existing_accessor_for_the_wrong_class_fails(self):
        bad = self.GOOD.replace("session.models.esm2", "session.models.esmc_600m")
        self.assertEqual(
            me.verify_block(
                bad, CLASSES, ACCESSORS, EMBED_ONLY, expected_accessor="esm2"
            ),
            ["expected ModelsAPI.esm2, got esmc_600m"],
        )

    def test_a_wrong_method_fails(self):
        bad = self.GOOD.replace("model.embed(", "model.embedd(")
        self.assertEqual(self.check(bad), ["ESM2 has no member embedd"])

    def test_a_missing_required_argument_fails(self):
        bad = self.GOOD.replace('["MKT"], reduction="MEAN"', 'reduction="MEAN"')
        self.assertEqual(self.check(bad), ["ESM2.embed is missing sequences"])

    def test_positional_unpacking_cannot_supply_a_required_argument(self):
        bad = self.GOOD.replace('["MKT"], reduction="MEAN"', "*[]")
        self.assertEqual(self.check(bad), ["ESM2.embed is called with * arguments"])

    def test_an_unknown_keyword_fails_even_when_the_method_takes_params(self):
        bad = self.GOOD.replace('reduction="MEAN"', "nope=1")
        self.assertEqual(self.check(bad), ["ESM2.embed has no parameter nope"])

    def test_a_keyword_given_twice_or_too_many_positionals_fail(self):
        twice = self.GOOD.replace(
            '["MKT"], reduction', '["MKT"], sequences=1, reduction'
        )
        self.assertEqual(self.check(twice), ["ESM2.embed gets sequences twice"])
        many = self.GOOD.replace('["MKT"], reduction="MEAN"', '["MKT"], "MEAN", 1, 2')
        self.assertEqual(
            self.check(many), ["ESM2.embed takes 2 positional arguments, got 4"]
        )

    def test_the_block_calls_the_advertised_verbs_in_order(self):
        wrong = self.GOOD.replace(
            'model.embed(["MKT"], reduction="MEAN")', 'model.logits(["MKT"])'
        )
        self.assertEqual(
            self.check(wrong, EMBED_ONLY),
            ["expected model calls ['embed'], got ['logits']"],
        )
        self.assertEqual(
            self.check(self.GOOD, {**EMBED_ONLY, "batch/logits": "logits"}),
            ["expected model calls ['embed', 'logits'], got ['embed']"],
        )

    def test_a_block_without_the_accessor_assignment_fails(self):
        self.assertEqual(
            self.check("```python\njob = 1\n```"),
            ["no `model = session.models.<accessor>` assignment"],
        )

    def test_a_missing_template_is_an_error(self):
        with self.assertRaisesRegex(
            me.ExampleError, "no example template for ESM2.embed"
        ):
            me.render_examples(
                CLASSES, "ESM2", "esm2", ["batch/embeddings"], {"verbs": {}}
            )

    def test_every_rendered_snippet_parses(self):
        for heading, section in sections().items():
            block = block_of(section)
            if block:
                with self.subTest(heading=heading):
                    ast.parse(BLOCK.findall(section["prose"])[0])


if __name__ == "__main__":
    unittest.main()
