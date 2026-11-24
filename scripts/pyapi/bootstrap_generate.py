"""One-time verified pin transition; only PIN is redirected."""

import argparse
import hashlib
import json
import sys
import sysconfig
from pathlib import Path

sys.path.insert(0, str(Path.cwd() / "scripts/pyapi"))
import generate as gen
from release_refresh import installed_proof, schema, source_proof


def run_bootstrap(pin, packages):
    original, argv = gen.PIN, sys.argv
    try:
        gen.PIN = pin
        if gen.verify_pin(packages) != 0:
            raise SystemExit("bootstrap source hashes failed before generation")
        sys.argv = ["generate"]
        gen.main()
    finally:
        gen.PIN, sys.argv = original, argv


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("sdk", type=Path)
    parser.add_argument("report", type=Path)
    parser.add_argument("pin", type=Path)
    parser.add_argument("receipt", type=Path)
    args = parser.parse_args()
    pin = args.pin.absolute()
    assert pin.is_relative_to(Path.cwd() / "docs/superpowers/verification")
    assert not pin.exists() and not pin.is_symlink()
    h = schema(json.loads(args.input.read_text()))
    source_proof(h, args.sdk, args.report)
    assert h["version"] is not None, "measured activation input required"
    receipt = json.loads(args.receipt.read_text())
    assert (
        receipt["activatedInputSha256"]
        == hashlib.sha256(args.input.read_bytes()).hexdigest()
    )
    assert receipt["version"] == h["version"] and receipt["commit"] == h["commit"]
    installed_proof(h, args.sdk)
    packages = Path(sysconfig.get_paths()["purelib"])
    files = {
        str(p.relative_to(packages)): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted((packages / "openprotein").rglob("*.py"))
    }
    pin.write_text(
        json.dumps(
            {
                "package": "openprotein-python",
                "version": h["version"],
                "commit": h["commit"],
                "repository": h["repository"],
                "branch": h["branch"],
                "files": files,
            },
            indent=2,
        )
        + "\n"
    )
    run_bootstrap(pin, packages)


if __name__ == "__main__":
    main()
