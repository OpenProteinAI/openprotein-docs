import hashlib
import json
import sys
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import generate as gen


class InstalledPinTests(unittest.TestCase):
    def test_installed_sdk_matches_the_checked_in_pin(self):
        self.assertEqual(gen.verify_pin(gen.site_packages()), 0)


class ReleasePinTests(unittest.TestCase):
    def setUp(self):
        self.root = Path(self.enterContext(TemporaryDirectory()))
        self.pin_path = self.root / "sdk-pin.json"
        (self.root / "requirements.txt").write_text("openprotein-python==1.2.3\n")
        package = self.root / "openprotein"
        package.mkdir()
        source = b"class Example: pass\n"
        (package / "example.py").write_bytes(source)
        self.unlinked = package / "unlinked.py"
        self.unlinked.write_text("default = 1\n")
        self.pin = {
            "package": "openprotein-python",
            "commit": gen.SDK_COMMIT,
            "tag_object": gen.SDK_TAG_OBJECT,
            "version": "1.2.3",
            "package_sha256": gen.release_package_digest(self.root),
            "files": {"openprotein/example.py": hashlib.sha256(source).hexdigest()},
        }
        self.pin_path.write_text(json.dumps(self.pin))
        dist = mock.Mock(version="1.2.3")
        dist.read_text.return_value = None
        self.dist = dist
        self.enterContext(
            mock.patch.multiple(gen, SDK_BRANCH=None, PIN=self.pin_path, HERE=self.root)
        )
        self.enterContext(mock.patch.object(gen, "distribution", return_value=dist))
        self.enterContext(mock.patch.object(gen, "version", return_value="1.2.3"))
        self.enterContext(
            mock.patch.object(gen, "site_packages", return_value=self.root)
        )

    def test_release_recapture_preserves_package_proof(self):
        specs = self.root / "specs"
        specs.mkdir()
        (specs / "openprotein.json").write_text(
            json.dumps(
                {
                    "entries": [{"source": {"file": "openprotein/example.py"}}],
                }
            )
        )
        with (
            mock.patch.object(gen, "SPECS", specs),
            mock.patch.object(gen, "ROOT", self.root),
            mock.patch.object(sys, "argv", ["generate", "--write-pin"]),
            self.assertRaises(SystemExit) as result,
        ):
            gen.main()
        self.assertEqual(result.exception.code, 0)
        recaptured = json.loads(self.pin_path.read_text())
        self.assertEqual(recaptured["package_sha256"], self.pin["package_sha256"])
        self.assertEqual(recaptured["files"], self.pin["files"])

    def test_release_identity_and_existing_hashes_gate_generation_and_recapture(self):
        for patch in (
            {"version": "1.2.4"},
            {"tag_object": "0" * 40},
            {"files": {"openprotein/example.py": "0" * 64}},
        ):
            with self.subTest(patch=patch):
                self.pin_path.write_text(json.dumps({**self.pin, **patch}))
                self.assert_blocked()

    def test_same_version_source_or_editable_install_is_refused(self):
        for identity in (
            {"url": gen.REPO, "vcs_info": {"vcs": "git", "commit_id": gen.SDK_COMMIT}},
            {"url": "file:///checkout", "dir_info": {"editable": True}},
        ):
            with self.subTest(identity=identity):
                self.dist.read_text.return_value = json.dumps(identity)
                self.assert_blocked()

    def test_unlinked_package_files_are_covered_by_the_release_proof(self):
        self.unlinked.write_text("default = 2\n")
        self.assert_blocked()

    def assert_blocked(self):
        self.assertEqual(gen.verify_pin(self.root), 1)
        for args in ([], ["--check"], ["--write-pin"]):
            before = self.pin_path.read_bytes()
            with (
                mock.patch.object(sys, "argv", ["generate", *args]),
                mock.patch.object(gen, "load_sdk") as load,
                mock.patch.object(gen, "write_pin") as write,
                self.assertRaisesRegex(SystemExit, "released SDK pin verification"),
            ):
                gen.main()
            load.assert_not_called()
            write.assert_not_called()
            self.assertEqual(self.pin_path.read_bytes(), before)


class SourcePinTests(unittest.TestCase):
    def setUp(self):
        self.enterContext(mock.patch.object(gen, "SDK_BRANCH", "preview"))
        distribution = self.enterContext(mock.patch.object(gen, "distribution"))
        distribution.return_value.read_text.return_value = json.dumps(self.direct_url())
        self.enterContext(
            mock.patch.object(
                gen.urllib.request,
                "urlopen",
                side_effect=AssertionError("network forbidden"),
            )
        )

    def direct_url(self):
        return {
            "url": gen.INSTALL_REPO + ".git",
            "vcs_info": {"vcs": "git", "commit_id": gen.SDK_COMMIT},
        }

    def test_source_identity_rejects_wrong_or_missing_metadata(self):
        good = self.direct_url()
        gen.validate_source_identity(json.dumps(good))
        for data in (
            None,
            "{}",
            json.dumps({**good, "url": "https://github.com/other/repo.git"}),
            json.dumps({**good, "vcs_info": {"vcs": "git", "commit_id": "b" * 40}}),
            json.dumps(
                {**good, "vcs_info": {"vcs": "hg", "commit_id": gen.SDK_COMMIT}}
            ),
        ):
            with self.subTest(data=data), self.assertRaises(SystemExit):
                gen.validate_source_identity(data)

    def test_source_and_release_metadata(self):
        source = gen.source_metadata("0.17.1.dev263+g3f737afe8")
        self.assertEqual(
            source,
            {"repository": gen.REPO, "ref": gen.SDK_COMMIT, "branch": gen.SDK_BRANCH},
        )
        with mock.patch.object(gen, "SDK_BRANCH", None):
            self.assertEqual(
                gen.source_metadata("1.2.3"),
                {"repository": gen.REPO, "ref": gen.SDK_COMMIT, "tag": "v1.2.3"},
            )

    def test_wrong_source_stops_before_writing_or_checking(self):
        for args in ([], ["--check"], ["--write-pin"], ["--delta", "--write"]):
            with (
                self.subTest(args=args),
                mock.patch.object(sys, "argv", ["generate", *args]),
                mock.patch.object(gen, "distribution") as dist,
                mock.patch.object(gen, "load_sdk") as load,
                mock.patch.object(gen, "write_pin") as write,
            ):
                dist.return_value.read_text.return_value = "{}"
                with self.assertRaisesRegex(SystemExit, "direct_url.json identity"):
                    gen.main()
                load.assert_not_called()
                write.assert_not_called()

    def test_pin_metadata_mismatch_fails_validation(self):
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            pin = Path(directory) / "pin.json"
            pin.write_text(
                json.dumps(
                    {
                        "commit": gen.SDK_COMMIT,
                        "version": gen.version("openprotein-python"),
                        "repository": "https://github.com/other/repo",
                        "branch": gen.SDK_BRANCH,
                        "files": {},
                    }
                )
            )
            with mock.patch.object(gen, "PIN", pin):
                self.assertEqual(gen.verify_pin(Path(directory)), 1)

    def test_wrong_pin_stops_before_generation_or_recapture(self):
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            pin = Path(directory) / "pin.json"
            pin.write_text(
                json.dumps(
                    {
                        "commit": gen.SDK_COMMIT,
                        "repository": "https://github.com/other/repo",
                        "branch": gen.SDK_BRANCH,
                    }
                )
            )
            for args in ([], ["--check"], ["--write-pin"]):
                with (
                    self.subTest(args=args),
                    mock.patch.object(gen, "PIN", pin),
                    mock.patch.object(sys, "argv", ["generate", *args]),
                    mock.patch.object(gen, "load_sdk") as load,
                    mock.patch.object(gen, "write_pin") as write,
                ):
                    with self.assertRaisesRegex(SystemExit, "source identity"):
                        gen.main()
                    load.assert_not_called()
                    write.assert_not_called()

    def test_online_proof_fails_closed_on_bad_tree_or_blob(self):
        import hashlib
        import subprocess
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "file.py").write_text("source")
            content = (root / "file.py").read_bytes()
            pin = root / "pin.json"
            pin.write_text(
                json.dumps(
                    {
                        "commit": gen.SDK_COMMIT,
                        "repository": gen.REPO,
                        "branch": gen.SDK_BRANCH,
                        "version": gen.version("openprotein-python"),
                        "files": {"file.py": hashlib.sha256(content).hexdigest()},
                    }
                )
            )
            blob = hashlib.sha1(f"blob {len(content)}\0".encode() + content).hexdigest()
            cases = [
                ({"truncated": True, "tree": []}, 1),
                (
                    {
                        "truncated": False,
                        "tree": [{"path": "file.py", "type": "blob", "sha": "0" * 40}],
                    },
                    1,
                ),
                (
                    {
                        "truncated": False,
                        "tree": [{"path": "file.py", "type": "blob", "sha": blob}],
                    },
                    0,
                ),
            ]
            with mock.patch.object(gen, "PIN", pin):
                for tree, expected in cases:
                    with (
                        self.subTest(tree=tree),
                        mock.patch.object(
                            gen.subprocess,
                            "run",
                            return_value=subprocess.CompletedProcess(
                                [], 0, json.dumps(tree), ""
                            ),
                        ),
                    ):
                        self.assertEqual(gen.verify_pin(root, online=True), expected)
                with mock.patch.object(
                    gen.subprocess, "run", side_effect=FileNotFoundError("gh")
                ):
                    self.assertEqual(gen.verify_pin(root, online=True), 1)

    def test_explicit_recapture_allows_commit_transition_only(self):
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            pin = Path(directory) / "pin.json"
            pin.write_text(
                json.dumps(
                    {
                        "commit": "a" * 40,
                        "repository": gen.REPO,
                        "branch": gen.SDK_BRANCH,
                    }
                )
            )
            with (
                mock.patch.object(gen, "PIN", pin),
                mock.patch.object(gen, "write_pin") as write,
                mock.patch.object(gen, "verify_pin", return_value=0),
            ):
                with mock.patch.object(sys, "argv", ["generate"]):
                    with self.assertRaisesRegex(SystemExit, "source identity"):
                        gen.main()
                    write.assert_not_called()
                with mock.patch.object(sys, "argv", ["generate", "--write-pin"]):
                    with self.assertRaises(SystemExit) as result:
                        gen.main()
                    self.assertEqual(result.exception.code, 0)
                    write.assert_called_once()

    def test_recapture_rejects_mutable_previous_ref(self):
        import tempfile

        with tempfile.TemporaryDirectory() as directory:
            pin = Path(directory) / "pin.json"
            pin.write_text(
                json.dumps(
                    {
                        "commit": "release/v0.18.0",
                        "repository": gen.REPO,
                        "branch": gen.SDK_BRANCH,
                    }
                )
            )
            with (
                mock.patch.object(gen, "PIN", pin),
                mock.patch.object(sys, "argv", ["generate", "--write-pin"]),
                mock.patch.object(gen, "write_pin") as write,
            ):
                with self.assertRaisesRegex(SystemExit, "source identity"):
                    gen.main()
                write.assert_not_called()
