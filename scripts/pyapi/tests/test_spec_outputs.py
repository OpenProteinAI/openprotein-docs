import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import generate as gen


def payload(module):
    return json.dumps({"module": module, "sdk": {"package": "openprotein-python"},
                       "generator": "scripts/pyapi + griffe 2.2.0", "entries": []}) + "\n"


class SpecOutputTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.specs = self.root / "specs"
        self.specs.mkdir()
        self.here = self.root / "scripts/pyapi"
        self.here.mkdir(parents=True)
        self.pages = self.root / "pages.json"
        self.pages.write_text(json.dumps({"pages": [{"page": "example", "sections": [
            {"heading": None, "entries": [{"directive": "autoclass", "target": "openprotein.Good", "options": {"members": True}}], "autosummary": []},
        ]}]}))
        patch = mock.patch.multiple(gen, ROOT=self.root, SPECS=self.specs, HERE=self.here, PAGES=self.pages)
        patch.start()
        self.addCleanup(patch.stop)
        (self.specs / "openprotein.old.json").write_text(payload("openprotein.old"))
        (self.specs / "other.openapi.json").write_text("REST")
        (self.specs / "openprotein.manual.json").write_text('{"manual":true}')

    def snapshot(self):
        return {p.name: (p.read_bytes(), p.stat().st_mtime_ns) for p in self.specs.iterdir() if p.is_file()}

    def run_main(self, *args, fail=False):
        def emit(package, target, *unused):
            if fail and target.endswith("Bad"):
                raise ValueError("fixture extraction failed")
            return {"path": target, "kind": "class", "members": [], "doc": "Fixture.", "parsed": []}
        with mock.patch.object(sys, "argv", ["generate", *args]), \
             mock.patch.object(gen, "site_packages", return_value=self.root), \
             mock.patch.object(gen, "load_sdk", return_value=(None, self.root, [])), \
             mock.patch.object(gen, "build_resolver", return_value=(None, None)), \
             mock.patch.object(gen, "emit_class", side_effect=emit), \
             mock.patch.object(gen, "report"), \
             mock.patch.object(gen, "report_delta", return_value=0), \
             mock.patch.object(gen, "report_holes", return_value=0), \
             mock.patch.object(gen, "verify_pin", return_value=0), \
             mock.patch.object(gen, "write_pin"), \
             mock.patch.object(gen, "upstream_report", return_value="Report\n"), \
             contextlib.redirect_stdout(io.StringIO()):
            gen.main()

    def test_full_generation_prunes_only_owned_specs(self):
        outside = self.root / "external.json"
        outside.write_text(payload("openprotein.link"))
        link = self.specs / "openprotein.link.json"
        link.symlink_to(outside)
        self.run_main()
        self.assertTrue(link.is_symlink())
        self.assertEqual(outside.read_text(), payload("openprotein.link"))
        self.assertFalse((self.specs / "openprotein.old.json").exists())
        self.assertTrue((self.specs / "openprotein.json").exists())
        self.assertEqual((self.specs / "other.openapi.json").read_text(), "REST")
        self.assertEqual((self.specs / "openprotein.manual.json").read_text(), '{"manual":true}')

    def test_check_preserves_files_and_missing_directory(self):
        before = self.snapshot()
        with self.assertRaises(SystemExit):
            self.run_main("--check")
        self.assertEqual(before, self.snapshot())
        missing = self.root / "missing"
        with mock.patch.object(gen, "SPECS", missing), self.assertRaises(SystemExit):
            self.run_main("--check")
        self.assertFalse(missing.exists())

    def test_partial_generation_preserves_stale_specs(self):
        self.run_main("--only", "example")
        self.assertTrue((self.specs / "openprotein.old.json").exists())
        for pages in ("", "missing", "example,"):
            before = self.snapshot()
            with self.subTest(pages=pages), self.assertRaises(SystemExit) as error:
                self.run_main("--only", pages)
            self.assertEqual(error.exception.code, 2)
            self.assertEqual(before, self.snapshot())

    def test_extraction_failure_preserves_every_output(self):
        manifest = json.loads(self.pages.read_text())
        manifest["pages"][0]["sections"][0]["entries"].append(
            {"directive": "autoclass", "target": "openprotein.Bad", "options": {"members": True}})
        self.pages.write_text(json.dumps(manifest))
        before = self.snapshot()
        with self.assertRaises(SystemExit):
            self.run_main(fail=True)
        self.assertEqual(before, self.snapshot())

    def test_diagnostic_modes_do_not_write_or_prune_specs(self):
        for flag in ("--diff", "--holes", "--delta", "--upstream", "--verify-pin", "--write-pin"):
            with self.subTest(flag=flag):
                before = self.snapshot()
                try:
                    self.run_main(flag)
                except SystemExit as error:
                    self.assertEqual(error.code, 0)
                self.assertEqual(before, self.snapshot())

    def test_check_rejects_write_flags_before_loading_or_writing(self):
        for flags in (("--check", "--write-pin"), ("--check", "--delta", "--write")):
            before = self.snapshot()
            with self.subTest(flags=flags), mock.patch.object(sys, "argv", ["generate", *flags]), \
                 mock.patch.object(gen, "site_packages") as load, \
                 mock.patch.object(gen, "write_pin") as pin_writer, \
                 mock.patch.object(gen, "report_delta") as delta_writer, \
                 contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    gen.main()
                self.assertEqual(error.exception.code, 2)
                load.assert_not_called()
                pin_writer.assert_not_called()
                delta_writer.assert_not_called()
            self.assertEqual(before, self.snapshot())

    def test_symlink_output_is_refused(self):
        outside = self.root / "outside.json"
        outside.write_text("outside")
        (self.specs / "openprotein.json").symlink_to(outside)
        with self.assertRaises(ValueError):
            gen._sync_specs({"openprotein": payload("openprotein")}, check=False, prune=True)
        self.assertEqual(outside.read_text(), "outside")
        self.assertTrue((self.specs / "openprotein.old.json").exists())

    def test_empty_full_generation_cannot_remove_owned_outputs(self):
        with self.assertRaises(ValueError):
            gen._sync_specs({}, check=False, prune=True)
        self.assertTrue((self.specs / "openprotein.old.json").exists())

    def test_write_failure_does_not_prune(self):
        with mock.patch.object(Path, "write_text", side_effect=OSError("fixture write failed")):
            with self.assertRaises(OSError):
                gen._sync_specs({"openprotein": payload("openprotein")}, check=False, prune=True)
        self.assertTrue((self.specs / "openprotein.old.json").exists())
