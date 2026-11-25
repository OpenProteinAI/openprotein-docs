import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import bootstrap_generate as boot
import generate as gen


class BootstrapTransitionTests(unittest.TestCase):
    def test_obsolete_source_path_does_not_control_bootstrap(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            specs = root / "specs"
            specs.mkdir()
            obsolete = specs / "openprotein.old.json"
            obsolete.write_text(
                json.dumps(
                    {"entries": [{"source": {"file": "openprotein/obsolete.py"}}]}
                )
            )
            fresh = root / "openprotein/new.py"
            fresh.parent.mkdir()
            fresh.write_text("class New: pass\n")
            pin = root / "bootstrap.json"
            current = root / "normal-pin.json"
            data = {
                "commit": gen.SDK_COMMIT,
                "repository": gen.REPO,
                "branch": gen.SDK_BRANCH,
                "version": "fixture",
                "files": {
                    "openprotein/new.py": hashlib.sha256(fresh.read_bytes()).hexdigest()
                },
            }
            pin.write_text(json.dumps(data))
            direct = {
                "url": gen.INSTALL_REPO,
                "vcs_info": {"vcs": "git", "commit_id": gen.SDK_COMMIT},
            }
            with (
                mock.patch.object(gen, "version", return_value="fixture"),
                mock.patch.object(gen, "distribution") as dist,
                mock.patch.object(gen, "SPECS", specs),
                mock.patch.object(gen, "PIN", current),
                mock.patch.object(gen, "ROOT", root),
            ):
                dist.return_value.read_text.return_value = json.dumps(direct)
                with self.assertRaises(FileNotFoundError):
                    gen.write_pin(root)

                # A wrapper fixture, not a simulation of griffe or a production generation claim.
                def emit():
                    obsolete.unlink()
                    (specs / "openprotein.new.json").write_text(
                        json.dumps(
                            {"entries": [{"source": {"file": "openprotein/new.py"}}]}
                        )
                    )

                with mock.patch.object(gen, "main", side_effect=emit) as generate:
                    boot.run_bootstrap(pin, root)
                    generate.assert_called_once()
                self.assertEqual(gen.PIN, current)
                gen.write_pin(root)
                self.assertEqual(gen.verify_pin(root), 0)
                self.assertEqual(
                    set(json.loads(current.read_text())["files"]),
                    {"openprotein/new.py"},
                )

    def test_identity_and_hash_failure_prevent_output_writes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            file = root / "source.py"
            file.write_text("unchanged")
            pin = root / "bootstrap.json"
            for wrong_identity in (True, False):
                data = {
                    "commit": gen.SDK_COMMIT,
                    "repository": gen.REPO,
                    "branch": gen.SDK_BRANCH,
                    "version": "fixture",
                    "files": {"source.py": "0" * 64},
                }
                pin.write_text(json.dumps(data))
                direct = {
                    "url": gen.INSTALL_REPO,
                    "vcs_info": {
                        "vcs": "git",
                        "commit_id": "b" * 40 if wrong_identity else gen.SDK_COMMIT,
                    },
                }
                with (
                    mock.patch.object(gen, "version", return_value="fixture"),
                    mock.patch.object(gen, "distribution") as dist,
                    mock.patch.object(gen, "main") as generate,
                ):
                    dist.return_value.read_text.return_value = json.dumps(direct)
                    with self.assertRaises(SystemExit):
                        boot.run_bootstrap(pin, root)
                    generate.assert_not_called()
                self.assertEqual(file.read_text(), "unchanged")
