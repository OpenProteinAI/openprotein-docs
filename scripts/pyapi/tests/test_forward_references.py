import sys
import tempfile
import unittest
from pathlib import Path

import griffe

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from members import type_parts


class ForwardReferenceTests(unittest.TestCase):
    def test_quoted_reference_uses_defining_scope_not_literal_values(self):
        source = """
from typing import Literal
class Model: pass
class Container: pass
class Quoted(Container['Model']): pass
class Missing(Container['Missing']): pass
class LiteralValue(Literal['Model']): pass
class Unquoted(Container[Model]): pass
"""
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / "fixture.py").write_text(source)
            module = griffe.load(
                "fixture", search_paths=[directory], allow_inspection=False
            )

            def resolve(path):
                return (
                    {"path": path, "page": "fixture"}
                    if path == "fixture.Model"
                    else None
                )

            def parts(name):
                cls = module[name]
                return type_parts(cls.bases[0], resolve, cls.parent)

            self.assertIn(
                {"text": "'Model'", "path": "fixture.Model", "page": "fixture"},
                parts("Quoted"),
            )
            self.assertFalse(any("path" in p for p in parts("Missing")))
            self.assertFalse(any("path" in p for p in parts("LiteralValue")))
            self.assertIn(
                {"text": "Model", "path": "fixture.Model", "page": "fixture"},
                parts("Unquoted"),
            )
