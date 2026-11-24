import contextlib
import io
import json
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any
from unittest import mock

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / "scripts/pyapi"))
import model_examples
import models_catalogue as mc

SDK_SOURCE = """
class ModelsAPI:
    @cached_property
    def SVD(self):
        return estimators.SVD._bind(self.session)

    @cached_property
    def GP(self):
        return estimators.GP._bind(self.session)

    @property
    def alpha_small(self):
        return self._handle("alpha-small", ProteinLanguageModel)

    @property
    def alpha(self):
        return self.alpha_small

    @property
    def alpha_big(self):
        return self._handle("alpha-big", ProteinLanguageModel)

    @property
    def beta(self):
        return self._handle("beta", StructurePredictionModel)

    @property
    def gamma(self):
        return self._handle("gamma", GammaModel)
"""
SDK = mc.parse_sdk_models(SDK_SOURCE)

CLASSES_SOURCE = """
class Model:
    def _run(self, verb, path, **params):
        return None

    def embed(self, sequences, **params):
        return self._run("embed", "batch/embeddings", sequences=sequences, **params)

    def fold(self, complexes, **params):
        return self._run("fold", "batch/structures", complexes=complexes, **params)


class ProteinLanguageModel(Model):
    def embed(self, sequences, reduction="MEAN", **params):
        return super().embed(sequences, reduction=reduction, **params)


class StructurePredictionModel(Model):
    pass


class GammaModel(Model):
    pass
"""
CLASSES = model_examples.parse_sdk_classes({"fixture.py": CLASSES_SOURCE})
METHODS = {
    "beta": ["batch/structures"],
    "gamma": ["batch/embeddings"],
    "alpha-big": ["batch/embeddings"],
    "alpha-small": ["batch/embeddings"],
}
SOURCE = mc.SdkSource(CLASSES, METHODS)
EXAMPLES = {
    "verbs": {
        "embed": ['job = model.embed(["MKT"])', "embeddings = job.wait()"],
        "fold": ['job = model.fold("MKT")', "structures = job.wait()"],
    },
    "classes": {
        "ProteinLanguageModel": {
            "verbs": {
                "embed": [
                    'job = model.embed(["MKT"], reduction="MEAN")',
                    "embeddings = job.wait()",
                ]
            }
        }
    },
}

ORDER: list[dict[str, str]] = [
    {"model_id": "beta", "model": "Beta", "name": "Beta"},
    {"model_id": "gamma", "model": "Gamma", "name": "Gamma"},
    {"model_id": "omega", "model": "Omega", "name": "Omega"},
    {"model_id": "alpha-big", "model": "Alpha", "name": "Alpha (big)"},
    {"model_id": "sigma-dev-x", "model": "Sigma", "name": "Sigma dev"},
    {"model_id": "alpha-small", "model": "Alpha", "name": "Alpha (small)"},
    {"model_id": "api-only", "model": "Delta", "name": "Delta"},
]
EXCLUDED = ["omega", "sigma-dev-*"]


def described(summary, title=None, doi=None, github=None):
    return {"summary": summary, "citation_title": title, "doi": doi, "github": github}


def listing_entry(model_id, **fields):
    return {"model_id": model_id, "name": "ignored", "description": described(**fields)}


CURATION: dict[str, Any] = {
    "intro": "Intro.",
    "excludedIds": EXCLUDED,
    "models": {
        "Gamma": {"usage": "Use `GammaModel`."},
    },
    "examples": EXAMPLES,
}


def render(
    descriptions,
    order: list[dict[str, str]] = ORDER,
    curation: dict[str, Any] = CURATION,
    sdk=SDK,
    source=SOURCE,
):
    derived = mc.derive_orders(order, sdk, curation["excludedIds"])
    prose, sections = mc.render_sections(
        order, descriptions, derived, curation, sdk, source
    )
    return derived, prose, {s["heading"]: s for s in sections}


class SdkSourceTests(unittest.TestCase):
    def test_models_aliases_interfaces_and_trainable_factories(self):
        by_name = {a.name: a for a in SDK.accessors}
        self.assertEqual(by_name["alpha"].alias_of, "alpha_small")
        self.assertEqual(by_name["alpha"].model_id, "alpha-small")
        self.assertEqual(by_name["gamma"].interface, "GammaModel")
        self.assertEqual(SDK.model_ids, {"alpha-small", "alpha-big", "beta", "gamma"})
        self.assertEqual(sorted(SDK.trainable), [("GP", "GP"), ("SVD", "SVD")])

    def test_unrecognised_accessor_shapes_are_errors(self):
        bad = "class ModelsAPI:\n    @property\n    def x(self):\n        return 3\n"
        with self.assertRaises(mc.CatalogueError):
            mc.parse_sdk_models(bad)
        with self.assertRaises(mc.CatalogueError):
            mc.parse_sdk_models("class Other:\n    pass\n")

    def test_the_pinned_sdk_parses(self):
        self.assertGreater(len(mc.load_sdk_models().model_ids), 40)


class DeriveTests(unittest.TestCase):
    def test_exclusions_skips_grouping_and_order(self):
        derived = mc.derive_orders(ORDER, SDK, EXCLUDED)
        self.assertEqual(
            derived.relevance_order, ["beta", "gamma", "alpha-big", "alpha-small"]
        )
        self.assertEqual(
            derived.base_order,
            [
                {"model": "Beta", "models": ["beta"]},
                {"model": "Gamma", "models": ["gamma"]},
                {"model": "Alpha", "models": ["alpha-big", "alpha-small"]},
            ],
        )
        self.assertEqual(derived.skipped, ["api-only"])
        self.assertEqual(derived.excluded, ["omega", "sigma-dev-x"])

    def test_sdk_model_missing_from_the_order_listing_is_an_error(self):
        order = [m for m in ORDER if m["model_id"] != "beta"]
        with self.assertRaisesRegex(mc.CatalogueError, "beta"):
            mc.derive_orders(order, SDK, EXCLUDED)

    def test_an_excluded_sdk_model_is_not_missing(self):
        order = [m for m in ORDER if m["model_id"] != "beta"]
        derived = mc.derive_orders(order, SDK, [*EXCLUDED, "beta"])
        self.assertNotIn("beta", derived.relevance_order)

    def test_listings_are_validated(self):
        with self.assertRaises(mc.CatalogueError):
            mc.trim_order({"models": []})
        with self.assertRaises(mc.CatalogueError):
            mc.trim_order([{"model_id": "a", "model": "A"}])
        with self.assertRaises(mc.CatalogueError):
            mc.trim_order([ORDER[0], ORDER[0]])

    def test_trim_order_keeps_only_id_model_and_name(self):
        extra = [{**ORDER[0], "tags": ["x"], "description": {}}]
        self.assertEqual(mc.trim_order(extra), [ORDER[0]])

    def test_descriptions_cover_public_listed_models_only(self):
        listing = [
            listing_entry("beta", summary="B", title="T"),
            listing_entry("unrelated", summary="U"),
            {"model_id": "gamma", "description": None},
        ]
        self.assertEqual(
            mc.trim_descriptions(listing, {"beta", "gamma"}),
            {"beta": described("B", "T")},
        )


class RenderTests(unittest.TestCase):
    def descriptions(self):
        return {
            "beta": described(
                "Beta summary.\n\nSecond paragraph.",
                "Beta paper",
                "https://doi/b",
                "https://gh/b",
            ),
            "alpha-big": described(
                "Alpha base.\n\nBig one.", "Alpha paper", "https://doi/a", None
            ),
            "alpha-small": described(
                "Alpha base.\n\nSmall one.", "Alpha paper", "https://doi/a", None
            ),
        }

    def test_sections_follow_first_appearance_and_own_the_class_only_they_use(self):
        _, _, sections = render(self.descriptions())
        self.assertEqual(list(sections), ["Beta", "Gamma", "Alpha"])
        for section in sections.values():
            self.assertEqual(
                (section["level"], section["nested"], section["autosummary"]),
                (3, True, []),
            )
        self.assertEqual(
            sections["Gamma"]["entries"],
            [
                {
                    "directive": "autoclass",
                    "target": "openprotein.models.GammaModel",
                    "options": {
                        "members": ["metadata", "methods", "embed"],
                        "inherited-members": True,
                    },
                }
            ],
        )
        self.assertEqual(sections["Beta"]["entries"], [])
        self.assertEqual(sections["Alpha"]["entries"], [])

    def test_base_summary_citation_and_table_rows_in_relevance_order(self):
        _, _, sections = render(self.descriptions())
        prose = sections["Beta"]["prose"]
        self.assertTrue(
            prose.startswith(
                "Beta summary.\n\nSecond paragraph.\n\n"
                "*[Beta paper](https://doi/b)* · [GitHub](https://gh/b)\n\n| Model ID |"
            )
        )
        rows = [
            line
            for line in sections["Alpha"]["prose"].splitlines()
            if line.startswith("| `")
        ]
        self.assertEqual(
            rows,
            [
                (
                    "| `alpha-big` | [`alpha_big`](#openprotein.models.ModelsAPI.alpha_big) "
                    "| [`ProteinLanguageModel`](#openprotein.models.ProteinLanguageModel) |"
                ),
                (
                    "| `alpha-small` | [`alpha`](#openprotein.models.ModelsAPI.alpha) (alias of `alpha_small`), "
                    "[`alpha_small`](#openprotein.models.ModelsAPI.alpha_small) "
                    "| [`ProteinLanguageModel`](#openprotein.models.ProteinLanguageModel) |"
                ),
            ],
        )

    def test_variant_note_keeps_only_paragraphs_the_base_lacks(self):
        _, _, sections = render(self.descriptions())
        prose = sections["Alpha"]["prose"]
        self.assertIn("\n\n**Alpha (small).** Small one.\n\n", prose)
        self.assertNotIn("**Alpha (small).** Alpha base.", prose)

    def test_variant_with_no_shared_paragraph_gets_its_full_summary(self):
        descriptions = self.descriptions()
        descriptions["alpha-small"] = described(
            "Unrelated text.\n\nMore.", "Alpha paper", "https://doi/a"
        )
        _, _, sections = render(descriptions)
        self.assertIn(
            "**Alpha (small).** Unrelated text.\n\nMore.", sections["Alpha"]["prose"]
        )

    def test_variant_citation_appended_only_where_it_differs_and_equal_notes_merge(
        self,
    ):
        sdk = mc.parse_sdk_models(
            SDK_SOURCE
            + "    @property\n    def alpha_mid(self):\n"
            + "        return self._handle('alpha-mid', ProteinLanguageModel)\n"
        )
        order = [m for m in ORDER if m["model"] == "Alpha"]
        order.insert(
            1, {"model_id": "alpha-mid", "model": "Alpha", "name": "Alpha (mid)"}
        )
        base = described("Alpha base.\n\nBig.", "Alpha paper", "https://doi/a")
        other = ("Other", "https://doi/o", "https://gh/o")
        descriptions = {
            "alpha-big": base,
            "alpha-mid": described("Alpha base.\n\nSame.", *other),
            "alpha-small": described("Alpha base.\n\nSame.", *other),
        }
        beta_free = {
            **CURATION,
            "excludedIds": EXCLUDED + ["beta", "gamma"],
            "models": {},
        }
        sdk = mc.SdkModels(
            tuple(a for a in sdk.accessors if a.model_id.startswith("alpha")), ()
        )
        source = mc.SdkSource(CLASSES, {**METHODS, "alpha-mid": ["batch/embeddings"]})
        _, _, sections = render(
            descriptions, order=order, curation=beta_free, sdk=sdk, source=source
        )
        prose = sections["Alpha"]["prose"]
        self.assertIn(
            "**Alpha (mid), Alpha (small).** Same. *[Other](https://doi/o)* · [GitHub](https://gh/o)",
            prose,
        )
        descriptions["alpha-mid"] = descriptions["alpha-small"] = {**base}
        _, _, sections = render(
            descriptions, order=order, curation=beta_free, sdk=sdk, source=source
        )
        self.assertNotIn("**Alpha (", sections["Alpha"]["prose"])

    def test_citation_formats(self):
        self.assertEqual(
            mc.citation(described("s", "T", "https://d", "https://g")),
            "*[T](https://d)* · [GitHub](https://g)",
        )
        self.assertEqual(mc.citation(described("s", "T")), "*T*")
        self.assertEqual(
            mc.citation(described("s", None, None, "https://g")), "[GitHub](https://g)"
        )
        self.assertEqual(mc.citation(described("s")), "")

    def test_missing_description_renders_curation_prose_and_table_only(self):
        _, _, sections = render({})
        self.assertTrue(
            sections["Gamma"]["prose"].startswith("Use `GammaModel`.\n\n| Model ID |")
        )
        self.assertTrue(sections["Beta"]["prose"].startswith("| Model ID |"))

    def test_models_prose_has_intro_and_the_two_column_trainable_table(self):
        _, prose, _ = render({})
        self.assertEqual(
            prose,
            "Intro.\n\n**Trainable models**\n\n| Accessors | Interface |\n| --- | --- |\n"
            "| [`GP`](#openprotein.models.ModelsAPI.GP) | [`GP`](#openprotein.models.GP) |\n"
            "| [`SVD`](#openprotein.models.ModelsAPI.SVD) | [`SVD`](#openprotein.models.SVD) |",
        )

    def test_curation_for_an_unproduced_base_or_stray_description_is_an_error(self):
        curation = {
            **CURATION,
            "models": {**CURATION["models"], "Nowhere": {"usage": "x"}},
        }
        with self.assertRaisesRegex(mc.CatalogueError, "Nowhere"):
            render({}, curation=curation)
        with self.assertRaisesRegex(mc.CatalogueError, "api-only"):
            render({"api-only": described("x")})

    def test_output_is_deterministic_and_idempotent(self):
        pages = {
            "pages": [
                {
                    "page": "models",
                    "sections": [
                        {"heading": "Interface", "nested": None},
                        {"heading": "Models", "prose": "old"},
                        {"heading": "Old base", "nested": True},
                        {"heading": "Model interfaces"},
                    ],
                }
            ]
        }
        derived = mc.derive_orders(ORDER, SDK, EXCLUDED)
        prose, sections = mc.render_sections(
            ORDER, self.descriptions(), derived, CURATION, SDK, SOURCE
        )
        first = mc.dumps(
            mc.apply_to_pages(json.loads(json.dumps(pages)), prose, sections)
        )
        again = mc.dumps(mc.apply_to_pages(json.loads(first), prose, sections))
        self.assertEqual(first, again)
        headings = [s["heading"] for s in json.loads(first)["pages"][0]["sections"]]
        self.assertEqual(
            headings,
            ["Interface", "Models", "Beta", "Gamma", "Alpha", "Model interfaces"],
        )

    def test_pages_without_a_models_section_are_an_error(self):
        with self.assertRaises(mc.CatalogueError):
            mc.apply_to_pages({"pages": [{"page": "models", "sections": []}]}, "", [])


class OwnedCardTests(unittest.TestCase):
    def accessors(self, *rows):
        return mc.SdkModels(tuple(mc.Accessor(n, i, c, None) for n, i, c in rows), ())

    def test_a_class_used_by_one_base_is_owned_and_shared_or_split_classes_are_not(
        self,
    ):
        sdk = self.accessors(
            ("a", "a", "OnlyA"),
            ("b1", "b1", "Split"),
            ("c", "c", "Split"),
            ("p", "p", "ProteinLanguageModel"),
            ("m", "m1", "OnlyM"),
            ("m2", "m2", "OnlyM"),
        )
        bases = [
            {"model": "A", "models": ["a"]},
            {"model": "B", "models": ["b1"]},
            {"model": "C", "models": ["c"]},
            {"model": "P", "models": ["p"]},
            {"model": "M", "models": ["m1", "m2"]},
        ]
        sdk = mc.SdkModels(
            tuple(
                mc.Accessor(
                    a.name, {"m": "m1"}.get(a.model_id, a.model_id), a.interface, None
                )
                for a in sdk.accessors
            ),
            (),
        )
        self.assertEqual(
            mc.owned_classes(bases, sdk),
            {"A": ["OnlyA"], "B": [], "C": [], "P": [], "M": ["OnlyM"]},
        )

    def test_curation_may_not_list_class_cards(self):
        bad = {**CURATION, "models": {"Gamma": {"cards": []}}}
        with (
            mock.patch.object(mc, "read_json", lambda path: bad),
            self.assertRaisesRegex(mc.CatalogueError, "derived from the SDK"),
        ):
            mc.load_curation()

    def test_a_section_whose_models_advertise_different_methods_is_an_error(self):
        methods = {**METHODS, "alpha-small": ["batch/logits"]}
        with self.assertRaisesRegex(mc.CatalogueError, "different methods"):
            render(
                {"alpha-big": described("x")},
                source=mc.SdkSource(CLASSES, methods),
            )

    def test_an_example_that_fails_verification_stops_the_render(self):
        examples = {
            **EXAMPLES,
            "verbs": {
                **EXAMPLES["verbs"],
                "fold": ["job = model.fold()", "x = job.wait()"],
            },
        }
        with self.assertRaisesRegex(mc.CatalogueError, "missing complexes"):
            render({}, curation={**CURATION, "examples": examples})


class MethodPathTests(unittest.TestCase):
    def test_public_card_paths_win_and_the_order_listing_fills_the_gaps(self):
        order = [
            {"model_id": "a", "methods": [{"path": "dev/only"}]},
            {"model_id": "b", "methods": [{"path": "batch/x"}, {"path": "batch/y"}]},
        ]
        public = [{"model_id": "a", "methods": [{"path": "batch/embeddings"}]}]
        self.assertEqual(
            mc.trim_methods(public, order, ["a", "b"]),
            {"a": ["batch/embeddings"], "b": ["batch/x", "batch/y"]},
        )

    def test_public_card_paths_do_not_require_order_listing_methods(self):
        public = [{"model_id": "a", "methods": [{"path": "batch/embeddings"}]}]
        order = [{"model_id": "a"}]
        self.assertEqual(
            mc.trim_methods(public, order, ["a"]), {"a": ["batch/embeddings"]}
        )

    def test_a_model_without_paths_in_either_listing_is_an_error(self):
        with self.assertRaisesRegex(mc.CatalogueError, "no method paths for: c"):
            mc.trim_methods([], [{"model_id": "a", "methods": []}], ["a", "c"])
        with self.assertRaises(mc.CatalogueError):
            mc.trim_methods([], [{"model_id": "a", "methods": [{"name": "x"}]}], ["a"])


class Workspace(unittest.TestCase):
    """A scratch copy of every file the catalogue owns, with the module pointed at it."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root = Path(self.tmp.name)
        self.paths = {
            "PAGES": root / "pages.json",
            "SOURCE_FIXTURE": root / "source.json",
            "DESCRIPTIONS_FIXTURE": root / "descriptions.json",
            "METHODS_FIXTURE": root / "methods.json",
            "RELEVANCE_FIXTURE": root / "relevance.json",
            "BASE_ORDER_FIXTURE": root / "base.json",
            "CURATION": root / "curation.json",
        }
        self.paths["PAGES"].write_text(
            mc.dumps(
                {
                    "pages": [
                        {
                            "page": "models",
                            "sections": [{"heading": "Models", "prose": ""}],
                        }
                    ]
                }
            )
        )
        self.paths["CURATION"].write_text(mc.dumps(CURATION))
        self.paths["SOURCE_FIXTURE"].write_text(mc.dumps(ORDER))
        self.paths["DESCRIPTIONS_FIXTURE"].write_text(
            mc.dumps({"beta": described("B")})
        )
        self.paths["METHODS_FIXTURE"].write_text(mc.dumps(METHODS))
        for name, path in self.paths.items():
            patcher = mock.patch.object(mc, name, path)
            patcher.start()
            self.addCleanup(patcher.stop)
        patcher = mock.patch.object(mc, "load_sdk_models", lambda: SDK)
        patcher.start()
        self.addCleanup(patcher.stop)
        patcher = mock.patch.object(model_examples, "load_sdk_classes", lambda: CLASSES)
        patcher.start()
        self.addCleanup(patcher.stop)

    def run_main(self, *args, env=None):
        out, err = io.StringIO(), io.StringIO()
        with (
            contextlib.redirect_stdout(out),
            contextlib.redirect_stderr(err),
            mock.patch.dict("os.environ", env or {}, clear=False),
        ):
            code = mc.main(list(args))
        return code, out.getvalue(), err.getvalue()


class CheckTests(Workspace):
    def test_check_fails_until_regenerated_then_passes_and_is_idempotent(self):
        self.assertEqual(self.run_main("--check")[0], 1)
        self.assertEqual(self.run_main()[0], 0)
        written = {n: p.read_text() for n, p in self.paths.items()}
        self.assertEqual(self.run_main("--check")[0], 0)
        self.assertEqual(self.run_main()[0], 0)
        self.assertEqual({n: p.read_text() for n, p in self.paths.items()}, written)

    def test_check_fails_on_a_hand_edited_models_section(self):
        self.run_main()
        pages = json.loads(self.paths["PAGES"].read_text())
        pages["pages"][0]["sections"][2]["prose"] += " edited"
        self.paths["PAGES"].write_text(mc.dumps(pages))
        code, _, err = self.run_main("--check")
        self.assertEqual(code, 1)
        self.assertIn("pages.json", err)

    def test_check_fails_on_a_fixture_edit_that_was_not_regenerated(self):
        self.run_main()
        order = json.loads(self.paths["SOURCE_FIXTURE"].read_text())
        order[0], order[1] = order[1], order[0]
        self.paths["SOURCE_FIXTURE"].write_text(mc.dumps(order))
        self.assertEqual(self.run_main("--check")[0], 1)
        self.assertEqual(self.run_main()[0], 0)
        self.assertEqual(self.run_main("--check")[0], 0)

    def test_check_fails_on_an_edited_derived_fixture(self):
        self.run_main()
        self.paths["BASE_ORDER_FIXTURE"].write_text(mc.dumps([]))
        self.assertEqual(self.run_main("--check")[0], 1)

    def test_an_sdk_model_missing_from_the_fixture_is_an_error_not_drift(self):
        self.paths["SOURCE_FIXTURE"].write_text(mc.dumps(ORDER[1:]))
        code, _, err = self.run_main("--check")
        self.assertEqual(code, 2)
        self.assertIn("beta", err)


class Api:
    """A local HTTP server answering the models listing path; it records every request."""

    def __init__(self, listing):
        self.routes = {mc.LISTING_PATH: (200, json.dumps(listing))}
        self.requests: list[tuple[str, str, dict[str, str]]] = []
        api = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, format, *args):
                pass

            def do_GET(self):
                api.requests.append((self.command, self.path, dict(self.headers)))
                if self.path == "/redirect":
                    self.send_response(302)
                    self.send_header("Location", mc.LISTING_PATH)
                    self.end_headers()
                    return
                if self.path.split("?")[0].endswith("/truncated"):
                    self.send_response(200)
                    self.send_header("Content-Length", "500")
                    self.end_headers()
                    self.wfile.write(b"[1,")
                    self.wfile.flush()
                    self.close_connection = True
                    return
                status, body = api.routes.get(self.path, (404, "not found"))
                self.send_response(status)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(body.encode())

            def do_POST(self):
                api.requests.append((self.command, self.path, dict(self.headers)))
                self.send_response(405)
                self.end_headers()

        self.server = HTTPServer(("127.0.0.1", 0), Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

    @property
    def base(self):
        return f"http://127.0.0.1:{self.server.server_port}"

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *exc):
        self.server.shutdown()
        self.server.server_close()

    def env(self):
        return {mc.PROXY_ENV: self.base, mc.TIMEOUT_ENV: "5"}


def with_methods(entry):
    paths = METHODS.get(entry["model_id"])
    return (
        entry if paths is None else {**entry, "methods": [{"path": p} for p in paths]}
    )


DESCRIBED = {
    "beta": described("B", title="T", doi="https://d"),
    "alpha-big": described("A\n\nbig"),
}


def api_entry(m, description=None):
    entry = {**m, "tags": ["x"]}
    if description or m["model_id"] in DESCRIBED:
        entry["description"] = description or DESCRIBED[m["model_id"]]
    return with_methods(entry)


API_LISTING = [api_entry(m) for m in ORDER]


class FetchTests(unittest.TestCase):
    def test_only_get_is_sent_with_no_credentials_or_cookies(self):
        with Api(API_LISTING) as api:
            self.assertEqual(
                mc.fetch_json(f"{api.base}{mc.LISTING_PATH}", 5), API_LISTING
            )
        ((method, path, headers),) = api.requests
        self.assertEqual((method, path), ("GET", mc.LISTING_PATH))
        names = {k.lower() for k in headers}
        self.assertFalse(
            names & {"authorization", "cookie", "proxy-authorization", "x-api-key"}
        )
        self.assertLessEqual(
            names, {"accept", "user-agent", "host", "connection", "accept-encoding"}
        )

    def test_non_200_and_malformed_json_and_redirects_fail(self):
        with Api(API_LISTING) as api:
            api.routes["/gone"] = (500, "boom")
            api.routes["/created"] = (201, "[]")
            api.routes["/garbled"] = (200, "{not json")
            for path in ("/gone", "/created", "/garbled", "/missing", "/redirect"):
                with self.assertRaises(mc.FetchError, msg=path):
                    mc.fetch_json(f"{api.base}{path}", 5)
            self.assertNotIn(mc.LISTING_PATH, [r[1] for r in api.requests])

    def test_unreachable_host_and_other_schemes_fail(self):
        with Api([]) as api:
            dead = api.base
        with self.assertRaises(mc.FetchError):
            mc.fetch_json(f"{dead}/order", 1)
        with self.assertRaises(mc.FetchError):
            mc.fetch_json("file:///etc/passwd", 1)

    def test_http_client_errors_are_fetch_errors(self):
        with Api(API_LISTING) as api, self.assertRaises(mc.FetchError):
            mc.fetch_json(f"{api.base}/truncated", 5)
        with self.assertRaises(mc.FetchError):
            mc.fetch_json("http://127.0.0.1:notaport/order", 1)

    def test_https_opener_verifies_certificates(self):
        built = []
        real = mc.urllib.request.build_opener

        def spy(*handlers):
            built.extend(handlers)
            return real(*handlers)

        with (
            Api(API_LISTING) as api,
            mock.patch.object(mc.urllib.request, "build_opener", spy),
        ):
            mc.fetch_json(f"{api.base}{mc.LISTING_PATH}", 5)
        https = [h for h in built if isinstance(h, mc.urllib.request.HTTPSHandler)]
        self.assertEqual(len(https), 1)
        context = https[0]._context  # type: ignore[attr-defined]
        self.assertTrue(context.check_hostname)
        self.assertEqual(context.verify_mode, mc.ssl.CERT_REQUIRED)

    def test_tls_context_branches_all_verify(self):
        import types

        certifi = types.SimpleNamespace(where=lambda: "/certifi/bundle.pem")
        calls = []
        real = mc.ssl.create_default_context

        def spy(*args, **kwargs):
            calls.append(kwargs)
            return real()

        def build(env, modules):
            calls.clear()
            with (
                mock.patch.dict("os.environ", env, clear=True),
                mock.patch.dict("sys.modules", modules),
                mock.patch.object(mc.ssl, "create_default_context", spy),
            ):
                return mc.tls_context()

        for var in ("SSL_CERT_FILE", "SSL_CERT_DIR"):
            context = build({var: "/x"}, {"certifi": certifi})
            self.assertEqual(calls, [{}], var)
            self.assertEqual(context.verify_mode, mc.ssl.CERT_REQUIRED)
        context = build({}, {"certifi": certifi})
        self.assertEqual(calls, [{"cafile": "/certifi/bundle.pem"}])
        self.assertTrue(context.check_hostname)
        self.assertEqual(context.verify_mode, mc.ssl.CERT_REQUIRED)
        context = build({}, {"certifi": None})
        self.assertEqual(calls, [{}])
        self.assertTrue(context.check_hostname)
        self.assertEqual(context.verify_mode, mc.ssl.CERT_REQUIRED)

    def test_real_context_verifies(self):
        context = mc.tls_context()
        self.assertTrue(context.check_hostname)
        self.assertEqual(context.verify_mode, mc.ssl.CERT_REQUIRED)

    def test_certificate_failure_adds_the_ca_hint_and_exits_2(self):
        failure = mc.ssl.SSLCertVerificationError("CERTIFICATE_VERIFY_FAILED")
        error = mc.urllib.error.URLError(failure)
        opener = mock.Mock()
        opener.open.side_effect = error
        with (
            mock.patch.object(mc.urllib.request, "build_opener", lambda *h: opener),
            self.assertRaises(mc.FetchError) as caught,
        ):
            mc.fetch_json("https://example.invalid/x", 1)
        self.assertIn("CERTIFICATE_VERIFY_FAILED", str(caught.exception))
        self.assertIn(mc.CERT_HINT, str(caught.exception))
        opener.open.side_effect = mc.urllib.error.URLError(OSError("refused"))
        with (
            mock.patch.object(mc.urllib.request, "build_opener", lambda *h: opener),
            self.assertRaises(mc.FetchError) as caught,
        ):
            mc.fetch_json("https://example.invalid/x", 1)
        self.assertNotIn(mc.CERT_HINT, str(caught.exception))

    def test_one_listing_from_the_proxy_serves_order_and_descriptions(self):
        with Api(API_LISTING) as api:
            order, descriptions = mc.fetch_listings(api.env())
        self.assertEqual((order, descriptions), (API_LISTING, API_LISTING))
        self.assertEqual([r[1] for r in api.requests], [mc.LISTING_PATH])
        with self.assertRaises(mc.CatalogueError):
            mc.fetch_listings({mc.TIMEOUT_ENV: "soon", mc.PROXY_ENV: "http://127.0.0.1:1"})

    def test_the_proxy_comes_from_the_environment(self):
        with self.assertRaisesRegex(mc.CatalogueError, mc.PROXY_ENV):
            mc.fetch_listings({})
        seen = []
        with mock.patch.object(
            mc, "fetch_json", lambda url, timeout: seen.append((url, timeout)) or []
        ):
            mc.fetch_listings({mc.PROXY_ENV: "http://proxy.test/"})
        self.assertEqual(seen, [("http://proxy.test" + mc.LISTING_PATH, 30.0)])


class RefreshAndReportTests(Workspace):
    def test_refresh_writes_the_snapshot_and_regenerates_the_sections(self):
        with Api(API_LISTING) as api:
            code, out, _ = self.run_main("--refresh", env=api.env())
        self.assertEqual(code, 0, out)
        self.assertIn("api-only", out)
        self.assertEqual(
            json.loads(self.paths["RELEVANCE_FIXTURE"].read_text()),
            ["beta", "gamma", "alpha-big", "alpha-small"],
        )
        self.assertEqual(
            json.loads(self.paths["SOURCE_FIXTURE"].read_text()),
            [m for m in ORDER if not mc.is_excluded(m["model_id"], EXCLUDED)],
        )
        self.assertEqual(
            list(json.loads(self.paths["DESCRIPTIONS_FIXTURE"].read_text())),
            ["beta", "alpha-big"],
        )
        self.assertEqual(self.run_main("--check")[0], 0)
        self.assertEqual({r[0] for r in api.requests}, {"GET"})

    def test_a_failed_fetch_writes_nothing(self):
        before = {n: p.exists() and p.read_text() for n, p in self.paths.items()}
        with Api(API_LISTING) as api:
            api.routes[mc.LISTING_PATH] = (503, "down")
            code, _, err = self.run_main("--refresh", env=api.env())
        self.assertEqual(code, 2)
        self.assertIn("503", err)
        self.assertEqual(
            {n: p.exists() and p.read_text() for n, p in self.paths.items()}, before
        )

    def test_report_exit_codes_and_no_writes(self):
        self.assertEqual(self.run_main()[0], 0)
        with Api(API_LISTING) as api:
            self.assertEqual(self.run_main("--refresh", env=api.env())[0], 0)
            before = {n: p.read_text() for n, p in self.paths.items()}
            code, out, _ = self.run_main("--report", env=api.env())
            self.assertEqual(code, 0, out)
            self.assertIn("no drift", out)

            changed = [dict(m) for m in API_LISTING]
            changed[0] = {
                **api_entry(ORDER[0], described("B2", title="T", doi="https://d")),
                "methods": [{"path": "batch/structures"}, {"path": "x/y"}],
            }
            changed[3]["name"] = "Alpha (large)"
            del changed[3]["description"]
            changed.insert(
                1, {"model_id": "new-api-only", "model": "New", "name": "New"}
            )
            api.routes[mc.LISTING_PATH] = (200, json.dumps(changed))
            code, out, _ = self.run_main("--report", env=api.env())
            self.assertEqual(code, 1)
            self.assertIn(
                "methods: beta paths ['batch/structures'] -> ['batch/structures', 'x/y']",
                out,
            )
            self.assertIn("added new-api-only", out)
            self.assertIn("alpha-big name 'Alpha (big)' -> 'Alpha (large)'", out)
            self.assertIn("descriptions: beta summary changed", out)
            self.assertIn("descriptions: removed alpha-big", out)
            self.assertEqual({n: p.read_text() for n, p in self.paths.items()}, before)

            api.routes[mc.LISTING_PATH] = (
                200,
                json.dumps([m for m in API_LISTING if m["model_id"] != "beta"]),
            )
            self.assertEqual(self.run_main("--report", env=api.env())[0], 2)
            self.assertEqual({r[0] for r in api.requests}, {"GET"})

    def test_truncated_body_and_bad_port_exit_2_not_1(self):
        with Api(API_LISTING) as api:
            env = {**api.env(), mc.PROXY_ENV: f"{api.base}/truncated"}
            for command in ("--report", "--refresh"):
                self.assertEqual(self.run_main(command, env=env)[0], 2, command)
            env[mc.PROXY_ENV] = "http://127.0.0.1:notaport"
            self.assertEqual(self.run_main("--report", env=env)[0], 2)

    def test_certificate_failure_exits_2_with_hint(self):
        failure = mc.urllib.error.URLError(mc.ssl.SSLCertVerificationError("bad"))
        with mock.patch.object(
            mc, "fetch_json", side_effect=mc.FetchError(f"x: {failure}\n{mc.CERT_HINT}")
        ):
            env = {mc.PROXY_ENV: "http://proxy.test"}
            code, _, err = self.run_main("--report", env=env)
        self.assertEqual(code, 2)
        self.assertIn("SSL_CERT_FILE", err)

    def test_report_detects_a_reordered_listing(self):
        with Api(API_LISTING) as api:
            self.run_main("--refresh", env=api.env())
            api.routes[mc.LISTING_PATH] = (200, json.dumps(list(reversed(API_LISTING))))
            code, out, _ = self.run_main("--report", env=api.env())
        self.assertEqual(code, 1)
        self.assertIn("relevance_order: changed", out)


class CommittedSnapshotTests(unittest.TestCase):
    def test_committed_files_equal_a_regeneration_from_the_snapshot(self):
        outputs = mc.offline_outputs()
        self.assertEqual(mc.stale_files(outputs), [])

    def test_committed_source_carries_names_for_every_listed_model(self):
        source = json.loads(mc.SOURCE_FIXTURE.read_text())
        self.assertTrue(all(set(m) == {"model_id", "model", "name"} for m in source))


if __name__ == "__main__":
    unittest.main()
