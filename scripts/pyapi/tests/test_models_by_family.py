import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "scripts/pyapi"))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import seed_pages as seed
from test_navigation import overview_rows, sdk_accessors

SECTION_IDS = {
    "PoET-2": "poet-2",
    "Protenix-v2": "protenix-v2",
    "Protenix": "protenix",
    "PoET": "poet",
    "ESM-IF1": "esm-if1",
    "BoltzGen": "boltzgen",
    "RFdiffusion": "rfdiffusion",
    "ProteinMPNN": "proteinmpnn",
    "ESM1": "esm1",
    "ESM2": "esm2",
}


# relevance-source.json is [{model_id, model, name}] trimmed from the dev listing
# catalogue-dev-20261119T023950/relevance.json (full listing sha256 171998873cebe642ee35ad48d443b2d2b09d2286fa7ec61fa7016214bffcf734)
def citation(d: dict) -> str:
    parts = []
    if d["citation_title"]:
        title = (
            f"[{d['citation_title']}]({d['doi']})" if d["doi"] else d["citation_title"]
        )
        parts.append(f"*{title}*")
    if d["github"]:
        parts.append(f"[GitHub]({d['github']})")
    return " · ".join(parts)


SHARED_CARDS = [
    "Model",
    "ProteinLanguageModel",
    "StructurePredictionModel",
    "StructureGenerativeModel",
]
RETIRED_SECTION_IDS = ("results-1",)
GROUP = re.compile(r'<PyGroup id="([^"]+)" title="([^"]+)"( level=\{3\})?')


def read(path: str) -> str:
    return (ROOT / path).read_text()


def curation() -> dict:
    return json.loads(read("scripts/pyapi/models-catalogue.json"))


def owned_cards(
    families: list[dict], accessors: dict[str, tuple], inputs: dict[str, str]
) -> dict[str, list[str]]:
    """Base model -> the classes only it uses, each followed by its input class.

    A class is owned when exactly one base model's accessors return it and it is not
    a shared interface. `inputs` maps a class to the input class that sits beside it.
    """
    interface = {row[0]: row[1] for row in accessors.values() if row[0] is not None}
    used = {
        f["model"]: list(dict.fromkeys(interface[m] for m in f["models"]))
        for f in families
    }
    owners: dict[str, int] = {}
    for classes in used.values():
        for name in classes:
            owners[name] = owners.get(name, 0) + 1
    owned: dict[str, list[str]] = {}
    for base, classes in used.items():
        names = []
        for name in classes:
            if owners[name] == 1 and name not in SHARED_CARDS:
                names += [name, *([inputs[name]] if name in inputs else [])]
        if names:
            owned[base] = names
    return owned


def excluded_fragments(data: dict) -> list[str]:
    return [p.rstrip("*") for p in data["excludedIds"]]


def expected_bases(source: list[dict], relevance: list[str]) -> list[str]:
    """Base models in first-appearance order among the catalogue's models."""
    names: list[str] = []
    for m in source:
        if m["model_id"] in set(relevance) and m["model"] not in names:
            names.append(m["model"])
    return names


def models_page() -> dict:
    manifest = json.loads(read("scripts/pyapi/pages.json"))
    return next(p for p in manifest["pages"] if p["page"] == "models")


def models_api(page: dict) -> dict:
    return next(
        e
        for s in page["sections"]
        for e in s["entries"]
        if e["target"] == "openprotein.models.ModelsAPI"
    )


def group_blocks(rendered: str) -> dict[str, str]:
    """Group title -> its MDX, from the opening tag to the closing one."""
    blocks = {}
    for match in GROUP.finditer(rendered):
        end = rendered.index("</PyGroup>", match.end())
        blocks[match[2]] = rendered[match.start() : end]
    return blocks


def retired_fragments(text: str) -> list[str]:
    found = re.findall(r"python-api/models#([\w.-]+)", text)
    return [f for f in found if f in RETIRED_SECTION_IDS]


def retired_ids_present(rendered: str) -> list[str]:
    ids = {m[1] for m in GROUP.finditer(rendered)}
    seen: dict[str, int] = {}
    for heading in re.findall(r"^#{2,4} (.+)$", rendered, re.MULTILINE):
        ids.add(seed.slugify(heading, seen))
    return [i for i in RETIRED_SECTION_IDS if i in ids]


class ModelsByBaseTests(unittest.TestCase):
    def setUp(self):
        self.families = json.loads(
            read("scripts/pyapi/tests/fixtures/models-base-order.json")
        )
        self.descriptions = json.loads(
            read("scripts/pyapi/tests/fixtures/models-descriptions.json")
        )
        self.relevance = json.loads(
            read("scripts/pyapi/tests/fixtures/models-relevance-order.json")
        )
        self.source = json.loads(
            read("scripts/pyapi/tests/fixtures/models-relevance-source.json")
        )
        self.curation = curation()
        self.owned = owned_cards(self.families, sdk_accessors(), {})
        self.page = models_page()
        self.sections = {s["heading"]: s for s in self.page["sections"]}
        self.rendered = read("content/docs/references/python-api/models.mdx")
        self.blocks = group_blocks(self.rendered)

    def test_base_model_sections_follow_relevance_order_under_models(self):
        headings = [s["heading"] for s in self.page["sections"]]
        names = [f["model"] for f in self.families]
        self.assertEqual(names, expected_bases(self.source, self.relevance))
        self.assertEqual(len(names), len(set(names)))
        start = headings.index("Models")
        self.assertEqual(headings[start + 1 : start + 1 + len(names)], names)
        self.assertEqual(headings[start + 1 + len(names)], "Model interfaces")
        self.assertEqual(self.sections["Models"]["level"], 2)
        for name in names:
            self.assertEqual(self.sections[name]["level"], 3, name)
            self.assertTrue(self.sections[name]["nested"], name)
        self.assertEqual([t for t in self.blocks if t in names], names)
        for name in names:
            self.assertIn(" level={3}", self.blocks[name].split("\n", 1)[0], name)
        self.assertRegex(self.rendered, r"(?m)^## Models$")

    def test_every_sdk_handle_appears_once_in_its_base_model(self):
        family_of = {m: f["model"] for f in self.families for m in f["models"]}
        seen: dict[str, str] = {}
        for family in self.families:
            for name, row in overview_rows(
                self.sections[family["model"]]["prose"]
            ).items():
                self.assertNotIn(name, seen, f"{name} listed twice")
                seen[name] = family["model"]
                self.assertEqual(family_of[row[0]], family["model"], name)
        handles = {n: row for n, row in sdk_accessors().items() if row[0] is not None}
        self.assertEqual(set(seen), set(handles))
        for name, (model_id, _, _) in handles.items():
            self.assertEqual(seen[name], family_of[model_id], name)
        links = re.findall(
            r"\]\(#openprotein\.models\.ModelsAPI\.(\w+)\)",
            "".join(self.sections[f["model"]]["prose"] for f in self.families),
        )
        self.assertEqual(len(links), len(set(links)))

    def test_base_tables_hold_every_catalogue_model_in_relevance_order(self):
        ids = []
        for family in self.families:
            rows = re.findall(
                r"^\| `([^`]+)` \|",
                self.sections[family["model"]]["prose"],
                re.MULTILINE,
            )
            self.assertEqual(rows, family["models"], family["model"])
            self.assertEqual(
                rows, [m for m in self.relevance if m in rows], family["model"]
            )
            ids += rows
        self.assertEqual(len(ids), len(self.relevance))
        self.assertCountEqual(ids, self.relevance)
        trainable = self.sections["Models"]["prose"]
        self.assertIn("**Trainable models**", trainable)
        for factory in ("GP", "SVD", "UMAP"):
            self.assertIn(f"ModelsAPI.{factory})", trainable)
        self.assertNotIn("`poet-2`", trainable)
        self.assertIn("| Accessors | Interface |", trainable)
        self.assertNotIn("Model ID", trainable)
        self.assertEqual(sorted(overview_rows(trainable)), ["GP", "SVD", "UMAP"])

    def test_orders_derive_from_the_dev_relevance_listing(self):
        source = json.loads(
            read("scripts/pyapi/tests/fixtures/models-relevance-source.json")
        )
        ids = [m["model_id"] for m in source if m["model_id"] in set(self.relevance)]
        self.assertEqual(ids, self.relevance)
        derived: dict[str, list[str]] = {}
        for m in source:
            if m["model_id"] in set(self.relevance):
                derived.setdefault(m["model"], []).append(m["model_id"])
        self.assertEqual(
            [[b["model"], b["models"]] for b in self.families],
            [[k, v] for k, v in derived.items()],
        )
        self.assertEqual(
            self.families[0]["model"],
            next(
                m["model"] for m in self.source if m["model_id"] in set(self.relevance)
            ),
        )

    def test_excluded_ids_are_absent(self):
        api = models_api(self.page)
        excluded_members = api["options"].pop("exclude-members")
        text = json.dumps(self.page) + self.rendered
        api["options"]["exclude-members"] = excluded_members
        self.assertTrue(excluded_fragments(self.curation))
        for excluded in excluded_fragments(self.curation):
            self.assertNotIn(excluded, text)
            self.assertNotIn(excluded, json.dumps(self.source))
            self.assertNotIn(excluded, json.dumps(self.descriptions))

    def test_models_api_leaves_out_the_excluded_accessors(self):
        hidden = set(sdk_accessors(excluded=True)) - set(sdk_accessors())
        self.assertTrue(hidden)
        self.assertEqual(
            models_api(self.page)["options"]["exclude-members"], sorted(hidden)
        )

    def test_owned_cards_live_in_their_family_section(self):
        names = [f["model"] for f in self.families]
        self.assertTrue(self.owned)
        self.assertLessEqual(set(self.owned), set(names))
        for family, cards in self.owned.items():
            paths = [f"openprotein.models.{c}" for c in cards]
            self.assertEqual(
                [e["target"] for e in self.sections[family]["entries"]], paths
            )
            for path in paths:
                self.assertIn(f'<PyClass path="{path}" />', self.blocks[family])
        for family in names:
            if family not in self.owned:
                self.assertEqual(self.sections[family]["entries"], [], family)
                self.assertNotIn("<PyClass", self.blocks[family], family)
        shared = self.blocks["Model interfaces"]
        for card in SHARED_CARDS:
            self.assertIn(f'<PyClass path="openprotein.models.{card}" />', shared)
            for family in names:
                self.assertNotIn(f'openprotein.models.{card}" />', self.blocks[family])
        positions = [
            self.rendered.index(f'<PyClass path="openprotein.models.{c}" />')
            for family in names
            for c in self.owned.get(family, [])
        ]
        self.assertEqual(positions, sorted(positions))

    def test_base_rows_link_their_interface_card(self):
        for family in self.families:
            allowed = set(self.owned.get(family["model"], [])) | set(SHARED_CARDS)
            for _, interface, _ in overview_rows(
                self.sections[family["model"]]["prose"]
            ).values():
                self.assertIn(interface, allowed, family["model"])

    def test_expectations_derive_from_inputs_and_catch_changes(self):
        names = expected_bases(self.source, self.relevance)
        self.assertNotEqual(expected_bases(self.source[::-1], self.relevance), names)
        self.assertNotEqual(expected_bases(self.source, self.relevance[1:]), names)
        self.assertEqual(self.owned["PoET-2"], ["PoET2"])
        self.assertEqual(self.owned["PoET"], ["PoET"])
        self.assertEqual(self.owned["ProteinMPNN"], ["ProteinMPNN"])
        for shared in ("ProteinLanguageModel", "StructurePredictionModel"):
            self.assertFalse(any(shared in c for c in self.owned.values()))
        merged = [{"model": "A", "models": ["x"]}, {"model": "B", "models": ["y"]}]
        accessors = {"x": ("x", "Same", None), "y": ("y", "Same", None)}
        self.assertEqual(owned_cards(merged, accessors, {}), {})
        self.assertEqual(
            owned_cards(merged[:1], accessors, {"Same": "SameInput"}),
            {"A": ["Same", "SameInput"]},
        )
        self.assertNotIn("openprotein.models.SolubleMPNN", json.dumps(self.page))
        self.assertEqual(excluded_fragments({"excludedIds": ["a", "b-*"]}), ["a", "b-"])
        self.assertNotEqual(
            self.rendered.replace("PoET-2", "PoET-X", 1).count("PoET-2"),
            self.rendered.count("PoET-2"),
        )

    def test_deprecated_results_group_is_merged_and_keeps_results_anchor(self):
        headings = [s["heading"] for s in self.page["sections"]]
        self.assertNotIn("Results", headings)
        self.assertEqual(headings.count("Deprecated results"), 1)
        section = self.sections["Deprecated results"]
        self.assertEqual(
            [e["target"] for e in section["entries"]],
            [
                "openprotein.models.RFdiffusionFuture",
                "openprotein.models.BoltzGenFuture",
            ],
        )
        self.assertIn("StructureDesignFuture", section["prose"])
        self.assertIn('<PyGroup id="results" title="Deprecated results"', self.rendered)
        block = self.blocks["Deprecated results"]
        self.assertIn("jobs#openprotein.jobs.StructureDesignFuture", block)
        self.assertEqual(self.rendered.count('title="Results"'), 0)

    def test_retired_section_ids_are_absent(self):
        self.assertEqual(retired_ids_present(self.rendered), [])
        for page in ("index",):
            self.assertEqual(
                retired_ids_present(
                    read(f"content/docs/references/python-api/{page}.mdx")
                ),
                [],
            )
        for retired, title in (("results-1", "Results"),):
            with self.subTest(retired=retired):
                self.assertEqual(
                    retired_ids_present(
                        self.rendered + f'\n<PyGroup id="{retired}" title="{title}"\n'
                    ),
                    [retired],
                )
                self.assertEqual(
                    retired_ids_present(self.rendered + f"\n### {title}\n"),
                    [retired] if retired != "results-1" else [],
                )
        self.assertEqual(
            retired_ids_present(self.rendered + "\n## Results\n## Results\n"),
            ["results-1"],
        )

    def test_restored_section_ids_resolve_and_ids_are_unique(self):
        ids = [m[1] for m in GROUP.finditer(self.rendered)]
        self.assertEqual(len(ids), len(set(ids)))
        for restored in ("poet", "rfdiffusion", "proteinmpnn", "boltzgen", "esm-if1"):
            self.assertIn(restored, ids)
        by_title = {m[2]: m[1] for m in GROUP.finditer(self.rendered)}
        for title, section_id in SECTION_IDS.items():
            self.assertEqual(by_title[title], section_id)
        self.assertEqual(retired_ids_present(self.rendered), [])
        self.assertEqual(
            retired_ids_present(self.rendered + '\n<PyGroup id="boltzgen" title="X"\n'),
            [],
        )

    def test_retired_ids_are_not_linked_from_content(self):
        for path in (
            *ROOT.joinpath("content").rglob("*.mdx"),
            *ROOT.joinpath("content").rglob("*.ipynb"),
        ):
            self.assertEqual(retired_fragments(path.read_text()), [], str(path))
        notebook = read(
            "content/notebooks/tutorials/design/generate/Nanobody_binder_design_with_BoltzGen.ipynb"
        )
        self.assertIn("python-api/models#openprotein.models.BoltzGen)", notebook)
        self.assertEqual(
            retired_fragments('"[x](/references/python-api/models#results-1)"'),
            ["results-1"],
        )
        self.assertEqual(
            retired_fragments("[x](/references/python-api/models#boltzgen)"), []
        )
        boltzgen = read("content/docs/tutorials/design/generate/boltzgen.mdx")
        self.assertIn(
            "(/references/python-api/models#openprotein.models.BoltzGen)", boltzgen
        )

    def test_descriptions_match_the_models_api_fixture(self):
        for base in self.families:
            prose = self.sections[base["model"]]["prose"]
            head = base["models"][0]
            if head not in self.descriptions:
                continue
            main = self.descriptions[head]
            self.assertTrue(prose.startswith(main["summary"] + "\n\n"), base["model"])
            if citation(main):
                self.assertIn("\n\n" + citation(main) + "\n\n", prose, base["model"])
            base_paras = set(main["summary"].split("\n\n"))
            for variant in base["models"][1:]:
                paras = self.descriptions[variant]["summary"].split("\n\n")
                shared = any(p in base_paras for p in paras)
                extra = [p for p in paras if p not in base_paras] if shared else paras
                for paragraph in extra:
                    self.assertIn(paragraph, prose, variant)
                for paragraph in paras:
                    if paragraph in base_paras:
                        self.assertEqual(
                            prose.count(paragraph), 1, (variant, paragraph)
                        )
        # ESM2 variants show only the extra paragraph, not the shared summary again
        esm2 = self.sections["ESM2"]["prose"]
        self.assertEqual(esm2.count("ESM2 masked protein language model"), 1)
        self.assertIn("**ESM2 (150M).** 150M parameters over 30 layers.", esm2)
        # a title without a DOI is plain text, no title and no link means no line
        boltzgen = self.sections["BoltzGen"]["prose"]
        self.assertIn("\n\n*BoltzGen: Toward Universal Binder Design*\n\n", boltzgen)
        self.assertNotIn("](None)", json.dumps(self.page))
        self.assertTrue(
            self.sections["ProtSeq"]["prose"].startswith(
                self.descriptions["prot-seq"]["summary"] + "\n\n| Model ID"
            )
        )

    def test_zero_card_groups_render_without_count_badge(self):
        for family in self.families:
            if family["model"] not in self.owned:
                self.assertIn(
                    "anchors={[]}", self.blocks[family["model"]], family["model"]
                )
        source = read("components/python-api/collapsible.tsx")
        self.assertIn("{anchors.length ? (", source)
        self.assertNotRegex(source, r"</button>\s*</h2>")


class SeedNestedGroupTests(unittest.TestCase):
    def body(self, *sections: dict) -> str:
        page = {"page": "demo", "title": "demo", "sections": list(sections)}
        return seed.body(page, {}, {"pages": [page]})

    def section(self, heading, **extra):
        return {
            "heading": heading,
            "level": 3,
            "prose": "Text.",
            "entries": [],
            "autosummary": [],
            **extra,
        }

    def test_nested_section_without_classes_is_a_level_three_group(self):
        body = self.body(self.section("Family", nested=True))
        self.assertIn('<PyGroup id="family" title="Family" level={3}', body)
        self.assertIn("anchors={[]}", body)
        self.assertIn("</PyGroup>", body)

    def test_nested_section_with_a_class_lists_it(self):
        entry = {
            "directive": "autoclass",
            "target": "openprotein.models.PoET",
            "options": {},
        }
        body = self.body(self.section("Family", nested=True, entries=[entry]))
        self.assertIn("level={3}", body)
        self.assertIn('"openprotein.models.PoET"', body)
        self.assertIn('<PyClass path="openprotein.models.PoET" />', body)

    def test_unflagged_level_three_sections_are_unchanged(self):
        entry = {
            "directive": "autoclass",
            "target": "openprotein.models.PoET",
            "options": {},
        }
        body = self.body(
            self.section("Plain", entries=[entry]), self.section("Prose only")
        )
        self.assertNotIn("level={3}", body)
        self.assertIn("### Prose only", body)
        self.assertNotIn('<PyGroup id="prose-only"', body)

    def test_explicit_id_is_registered_so_a_later_heading_cannot_duplicate_it(self):
        entry = {
            "directive": "autoclass",
            "target": "openprotein.models.PoET",
            "options": {},
        }
        body = self.body(
            self.section("Deprecated results", id="results", entries=[entry]),
            self.section("Results", entries=[entry]),
        )
        self.assertIn('<PyGroup id="results" title="Deprecated results"', body)
        self.assertIn('<PyGroup id="results-1" title="Results"', body)
        self.assertEqual(body.count('id="results"'), 1)

    def test_explicit_id_overrides_slug_but_still_counts_the_heading(self):
        entry = {
            "directive": "autoclass",
            "target": "openprotein.models.PoET",
            "options": {},
        }
        body = self.body(
            self.section("Deprecated results", id="results", entries=[entry]),
            self.section("Deprecated results", entries=[entry]),
        )
        self.assertIn('<PyGroup id="results" title="Deprecated results"', body)
        self.assertIn(
            '<PyGroup id="deprecated-results-1" title="Deprecated results"', body
        )
