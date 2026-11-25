import sys
import tempfile
import unittest
from pathlib import Path

import griffe

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from members import describe, select


class MemberAnnotationTests(unittest.TestCase):
    def test_documented_annotations_select_and_serialize_with_real_source(self):
        source = '''\
class Base:
    """Base.

    Attributes
    ----------
    inherited : int
        Inherited field.
    masked : str
        Masked field.
    """
    inherited: int
    masked: str

class Child(Base):
    """Child.

    Attributes
    ----------
    own : float
        Own field.
    """
    own: float
    def __init__(self):
        self.masked = "value"
'''
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / "fixture.py").write_text(source)
            module = griffe.load(
                "fixture",
                search_paths=[directory],
                docstring_parser="numpy",
                allow_inspection=False,
            )
            cls = module["Child"]
            selected = select(module, cls, {"members": True, "inherited-members": True})
            described = {
                name: describe(module, cls, name, member, extra)
                for name, member, extra in selected
            }
            for name, annotation, line in (
                ("own", "float", 22),
                ("inherited", "int", 11),
                ("masked", "str", 24),
            ):
                with self.subTest(name=name):
                    self.assertEqual(described[name]["annotation"], annotation)
                    self.assertEqual(
                        described[name]["source"],
                        {
                            "file": f"{Path(directory).name}/fixture.py",
                            "line": line,
                            "end": line,
                        },
                    )
            self.assertEqual(described["inherited"]["inherited_from"], "fixture.Base")
            self.assertIsNone(described["masked"]["inherited_from"])

    def test_undocumented_annotations_require_undoc_members(self):
        source = """
class Base:
    inherited: int
    masked: int

class Child(Base):
    own: int
    def __init__(self):
        self.masked = 1
        self.untyped = 2
"""
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / "fixture.py").write_text(source)
            module = griffe.load(
                "fixture", search_paths=[directory], allow_inspection=False
            )
            options = {"members": True, "inherited-members": True}
            names = {name for name, _, _ in select(module, module["Child"], options)}
            self.assertTrue({"own", "inherited", "masked", "untyped"}.isdisjoint(names))
            options["undoc-members"] = True
            names = {name for name, _, _ in select(module, module["Child"], options)}
            self.assertTrue({"own", "inherited", "masked"}.issubset(names))
            self.assertNotIn("untyped", names)
