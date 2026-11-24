import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import seed_pages as seed


class SeedCheckTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.out = self.root / "out"
        self.pages = self.root / "pages.json"
        self.manifest = {"pages": [self.page("one", "Intro.")]}
        patch = mock.patch.multiple(seed, OUT=self.out, PAGES=self.pages, GOLDEN=self.root / "golden")
        patch.start()
        self.addCleanup(patch.stop)

    def page(self, name, prose):
        return {"page": name, "title": name, "sections": [
            {"heading": None, "level": 0, "prose": prose, "entries": [], "autosummary": []},
        ]}

    def run_seed(self, *args):
        self.pages.write_text(json.dumps(self.manifest))
        with mock.patch.object(sys, "argv", ["seed", *args]), contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            seed.main()

    def snapshot(self):
        return {str(p.relative_to(self.out)): (p.read_bytes(), p.stat().st_mtime_ns)
                for p in self.out.rglob("*") if p.is_file()} if self.out.exists() else {}

    def test_check_does_not_create_missing_output(self):
        with self.assertRaises(SystemExit):
            self.run_seed("--sync", "--check")
        self.assertFalse(self.out.exists())

    def test_stale_metadata_check_preserves_outputs(self):
        self.run_seed("--sync")
        (self.out / "meta.json").write_text('{"sentinel": true}')
        before = self.snapshot()
        with self.assertRaises(SystemExit):
            self.run_seed("--sync", "--check")
        self.assertEqual(self.snapshot(), before)

    def test_current_check_preserves_bytes_and_mtimes(self):
        self.run_seed("--sync")
        before = self.snapshot()
        self.run_seed("--sync", "--check")
        self.assertEqual(self.snapshot(), before)

    def test_sync_preserves_existing_frontmatter(self):
        self.out.mkdir()
        front = '---\ntitle: Custom\ndescription: Custom description\npythonApi: true\n---\n'
        (self.out / "one.mdx").write_text(front + "Old body.\n")
        self.run_seed("--sync")
        self.assertEqual((self.out / "one.mdx").read_text(), front + "Intro.\n")

    def test_unknown_link_fails_before_any_page_write(self):
        self.run_seed("--sync")
        before = self.snapshot()
        self.manifest["pages"][0]["sections"][0]["prose"] = "Changed."
        self.manifest["pages"].append(self.page("two", "[`bad`](#openprotein.Absent)"))
        with self.assertRaises(ValueError):
            self.run_seed("--sync")
        self.assertEqual(self.snapshot(), before)

    def test_invalid_modes_preserve_outputs(self):
        with self.assertRaises(SystemExit) as error:
            self.run_seed("--check")
        self.assertEqual(error.exception.code, 2)
        for pages in ("", "missing", "one,"):
            with self.subTest(pages=pages), self.assertRaises(SystemExit) as error:
                self.run_seed("--sync", "--only", pages)
            self.assertEqual(error.exception.code, 2)
        self.assertFalse(self.out.exists())


if __name__ == "__main__":
    unittest.main()
