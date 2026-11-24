import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


class ModelsRelevanceOrderTests(unittest.TestCase):
    def test_catalogue_order(self):
        manifest = json.loads((ROOT / "scripts/pyapi/pages.json").read_text())
        page = next(p for p in manifest["pages"] if p["page"] == "models")
        bases = json.loads(
            (ROOT / "scripts/pyapi/tests/fixtures/models-base-order.json").read_text()
        )
        sections = {s["heading"]: s for s in page["sections"]}
        expected = json.loads(
            (
                ROOT / "scripts/pyapi/tests/fixtures/models-relevance-order.json"
            ).read_text()
        )
        actual = []
        for base in bases:
            rows = re.findall(
                r"^\| `([^`]+)` \|", sections[base["model"]]["prose"], re.MULTILINE
            )
            self.assertEqual(rows, [m for m in expected if m in base["models"]])
            actual += rows
        self.assertCountEqual(actual, expected)
        self.assertEqual(len(actual), len(set(actual)))
