import json
import sys
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import generate as gen


class SourcePinTests(unittest.TestCase):
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

    def test_real_installed_source_identity(self):
        gen.validate_source_identity(
            gen.distribution("openprotein-python").read_text("direct_url.json")
        )

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
