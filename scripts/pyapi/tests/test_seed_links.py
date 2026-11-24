import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import seed_pages as seed


class SeedLinkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.patch = mock.patch.object(seed, "SPECS", self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.write("one", [
            {"path": "openprotein.A", "page": "one", "members": [{"name": "method"}]},
            {"path": "openprotein.connect", "page": "openprotein"},
            {"path": "openprotein.Hidden", "page": None, "summary_only": True},
        ])

    def write(self, module, entries):
        (self.root / f"openprotein.{module}.json").write_text(json.dumps({"entries": entries}))

    def test_indexes_members_and_functions(self):
        known = seed.documented()
        self.assertEqual(known["openprotein.A.method"], "one")
        self.assertEqual(known["openprotein.connect"], "openprotein")

    def test_same_page_member_link(self):
        text = "[`method`](#openprotein.A.method)"
        self.assertEqual(seed.resolve_links(text, seed.documented(), "one"), text)

    def test_cross_page_member_link(self):
        self.assertEqual(
            seed.resolve_links("[`method`](#openprotein.A.method)", seed.documented(), "other"),
            "[`method`](/references/python-api/one#openprotein.A.method)",
        )

    def test_unknown_internal_target_fails_with_page_and_path(self):
        with self.assertRaisesRegex(ValueError, "other.*openprotein.A.absent"):
            seed.resolve_links("[`absent`](#openprotein.A.absent)", seed.documented(), "other")

    def test_explicit_unpublished_root_names_are_plain(self):
        for name in ("Protein", "Model"):
            self.assertEqual(seed.resolve_links(f"[`{name}`](#openprotein.{name})", {}, "one"), f"`{name}`")

    def test_external_and_ordinary_links_are_untouched(self):
        text = "[site](https://example.com) [section](#interface)"
        self.assertEqual(seed.resolve_links(text, {}, "one"), text)

    def test_summary_only_entries_are_not_published(self):
        self.assertNotIn("openprotein.Hidden", seed.documented())

    def test_ambiguous_publication_page_fails(self):
        self.write("two", [{"path": "openprotein.A", "page": "two"}])
        with self.assertRaisesRegex(ValueError, "openprotein.A"):
            seed.documented()
