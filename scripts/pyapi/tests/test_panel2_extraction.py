import json
import sys
import tempfile
import unittest
from pathlib import Path

import griffe

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from members import describe, generic_bindings, overload_contract, type_parts


class Panel2ExtractionTests(unittest.TestCase):
    def test_resolved_aliases_literals_and_generic_binding(self):
        source = """\
from typing import Any as _Any, Generic, TypeVar, Literal, overload
from . import public as _public
V = TypeVar("V")
class Base(Generic[V]):
    @overload
    def read(self, output: None = None) -> list[V]: ...
    @overload
    def read(self, output: str = "other") -> list[_Any]: ...
    def read(self, output = None): ...
class Child(Base[_public.Item]): pass
class Unknown(Base): pass
def values(x: Literal["_public.Item"]) -> tuple[_public.Item, _Any]: ...
"""
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "fixture"
            root.mkdir()
            (root / "__init__.py").write_text(source)
            (root / "public.py").write_text("class Item: pass\n")
            mod = griffe.load(
                "fixture",
                search_paths=[directory],
                allow_inspection=False,
                resolve_aliases=True,
            )

            def resolve(p):
                return (
                    {"path": p, "page": "fixture"}
                    if p == "fixture.public.Item"
                    else None
                )

            binding = generic_bindings(mod["Child"], mod["Base"])
            overloads = mod["Base"]["read"].overloads
            parts = type_parts(overloads[0].returns, resolve, bindings=binding)
            named = overload_contract(overloads[1], resolve=resolve, bindings=binding)
            self.assertEqual(
                "".join(p["text"] for p in named["returns_parts"]), "list[Any]"
            )
            self.assertEqual("".join(p["text"] for p in (parts or [])), "list[Item]")
            self.assertEqual(generic_bindings(mod["Unknown"], mod["Base"]), {})
            returns = type_parts(mod["values"].returns, resolve)
            self.assertEqual(
                "".join(p["text"] for p in (returns or [])), "tuple[Item, Any]"
            )
            literal = type_parts(mod["values"].parameters["x"].annotation, resolve)
            self.assertIn("'_public.Item'", "".join(p["text"] for p in (literal or [])))

    def test_public_display_preserves_raw_constructor_and_generic_bases(self):
        root = Path(__file__).resolve().parents[3]
        molecules = json.loads((root / "specs/openprotein.molecules.json").read_text())
        for entry in molecules["entries"]:
            if entry["name"] in {"DNA", "RNA", "Ligand"}:
                self.assertIn("_structure_block=None", entry["signature"])
                self.assertNotIn("_structure_block", entry["display_signature"])
                self.assertEqual(entry["bases"], ["_BasicSerde"])
                self.assertEqual(entry["bases_parts"], [])
                params = next(
                    s["items"] for s in entry["parsed"] if s["kind"] == "parameters"
                )
                actual = [(p["name"], p["type"], p["default"]) for p in params]
                expected = (
                    [("ccd", "str | None", "None"), ("smiles", "str | None", "None")]
                    if entry["name"] == "Ligand"
                    else [("sequence", "str", None), ("cyclic", "bool", "False")]
                )
                self.assertEqual(actual, expected)
        jobs = json.loads((root / "specs/openprotein.jobs.json").read_text())
        entry = next(e for e in jobs["entries"] if e["name"] == "EmbeddingFuture")
        self.assertTrue(entry["bases_parts"])
        get = next(m for m in entry["members"] if m["name"] == "get")
        returns = [
            "".join(p["text"] for p in c["returns_parts"])
            for c in get["overload_contracts"]
        ]
        self.assertEqual(returns, ["list[np.ndarray]", "list[Any]"])

    def test_inherited_reader_delegation_and_override_parameters(self):
        source = '''\
class Future:
    def get(self, verbose=False, **kwargs):
        return self._get(verbose=verbose, **kwargs)
    def _get(self, verbose=False, **kwargs):
        """Base read."""
class Reader(Future):
    def _get(self, verbose=False, **kwargs) -> list[str]:
        """Read child results."""
class Own(Reader):
    def get(self, verbose=False, **kwargs):
        """Public contract."""
        return self._get(verbose=verbose, **kwargs)
class Typed(Reader):
    def get(self, verbose=False, **kwargs) -> str:
        return self._get(verbose=verbose, **kwargs)
class NotFuture:
    def get(self):
        return self._get()
    def _get(self) -> str:
        """Not a future."""
class Ancestor:
    def read(self, k, value):
        """Read.

        Parameters
        ----------
        k : int
            Old key.
        value : str
            Value.
        """
class Override(Ancestor):
    def read(self, value): pass
class Flexible(Ancestor):
    def read(self, value, **kwargs): pass
class Positional(Ancestor):
    def read(self, value, *args): pass
'''
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / "openprotein" / "jobs"
            root.mkdir(parents=True)
            (root.parent / "__init__.py").write_text("")
            (root / "__init__.py").write_text("")
            (root / "futures.py").write_text(source)
            package = griffe.load(
                "openprotein", search_paths=[directory], allow_inspection=False
            )
            mod = package["jobs.futures"]
            reader = mod["Reader"]
            get = mod["Future"]["get"]
            result = describe(
                package,
                reader,
                "get",
                get,
                {"kind": "method", "doc": "", "doc_owner": None},
            )
            self.assertEqual(result["doc"], "Read child results.")
            self.assertEqual(result["returns"], "list[str]")
            typed = mod["Typed"]["get"]
            result = describe(
                package,
                mod["Typed"],
                "get",
                typed,
                {"kind": "method", "doc": "", "doc_owner": None},
            )
            self.assertEqual(result["returns"], "str")
            other = mod["NotFuture"]["get"]
            result = describe(
                package,
                mod["NotFuture"],
                "get",
                other,
                {"kind": "method", "doc": "", "doc_owner": None},
            )
            self.assertFalse(result["doc"])
            self.assertIsNone(result["returns"])
            own = mod["Own"]["get"]
            result = describe(
                package,
                mod["Own"],
                "get",
                own,
                {"kind": "method", "doc": "Public contract.", "doc_owner": own},
            )
            self.assertEqual(result["doc"], "Public contract.")
            for name, expected in [
                ("Override", ["value"]),
                ("Flexible", ["k", "value"]),
                ("Positional", ["k", "value"]),
            ]:
                cls = mod[name]
                result = describe(
                    package,
                    cls,
                    "read",
                    cls["read"],
                    {
                        "kind": "method",
                        "doc": "Read.",
                        "doc_owner": mod["Ancestor"]["read"],
                    },
                )
                items = next(
                    s["items"] for s in result["parsed"] if s["kind"] == "parameters"
                )
                self.assertEqual(
                    [
                        i["name"]
                        for i in items
                        if i["name"] not in {"**kwargs", "*args"}
                    ],
                    expected,
                )


if __name__ == "__main__":
    unittest.main()
