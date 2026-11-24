import json
import sys
import sysconfig
import tempfile
import unittest
from pathlib import Path

import griffe

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from members import pydantic_signature, select
from sdk import deref, load_sdk


class PydanticSignatureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.package, _, _ = load_sdk(Path(sysconfig.get_paths()["purelib"]))

    def test_trained_kernel_signatures_omit_discriminator(self):
        expected = {
            "TrainedKernel": "(*, outputscale)",
            "LinearKernel": "(*, outputscale)",
            "RBFKernel": "(*, outputscale, lengthscale)",
            "Matern12Kernel": "(*, outputscale, lengthscale)",
            "Matern32Kernel": "(*, outputscale, lengthscale)",
            "Matern52Kernel": "(*, outputscale, lengthscale)",
            "PeriodicKernel": "(*, outputscale, lengthscale, period)",
            "RationalQuadraticKernel": "(*, outputscale, lengthscale, alpha)",
        }
        root = Path(__file__).resolve().parents[3]
        document = json.loads((root / "specs/openprotein.models.json").read_text())
        entries = {entry["path"]: entry for entry in document["entries"]}
        for name, signature in expected.items():
            with self.subTest(name=name):
                cls = deref(self.package["models"][name])
                self.assertIs(deref(self.package["predictor"][name]), cls)
                self.assertEqual(pydantic_signature(cls), signature)
                self.assertEqual(
                    entries[f"openprotein.models.{name}"]["signature"], signature
                )
                self.assertIn("type", cls.members)
                self.assertEqual(cls.members["type"].labels, {"class-attribute"})

    def test_static_classvar_spellings_overrides_and_metadata(self):
        source = '''
from typing import ClassVar, ClassVar as CV
import typing as t
from pydantic import BaseModel, ConfigDict

class Base(BaseModel):
    """Base.

    Attributes
    ----------
    tag : str
        A documented discriminator.
    """
    model_config = ConfigDict(extra="allow")
    tag: ClassVar[str] = "base"
    inherited: int
    unchanged: int = 4
    named: OtherClassVar = 1

class Derived(Base):
    inherited: CV[int] = 3
    qualified: t.ClassVar[str] = "q"
    unchanged: int = 9
    addition: int = 7

class OnlyBase(BaseModel):
    only: int

class NoFields(OnlyBase):
    only: CV[int] = 3

class ExtraBase(BaseModel):
    model_config = ConfigDict(extra="allow")
    only: int

class ExtraOnly(ExtraBase):
    only: CV[int] = 3
'''
        with tempfile.TemporaryDirectory() as directory:
            (Path(directory) / "fixture.py").write_text(source)
            module = griffe.load(
                "fixture",
                search_paths=[directory],
                docstring_parser="numpy",
                allow_inspection=False,
            )
            base, derived = module["Base"], module["Derived"]
            self.assertEqual(pydantic_signature(module["NoFields"]), "()")
            self.assertEqual(pydantic_signature(module["ExtraOnly"]), "(**extra_data)")
            self.assertEqual(
                pydantic_signature(base),
                "(*, inherited, unchanged=4, named=1, **extra_data)",
            )
            self.assertEqual(
                pydantic_signature(derived),
                "(*, unchanged=9, named=1, addition=7, **extra_data)",
            )
            documented = {
                name: extra["doc"]
                for name, _, extra in select(
                    module, base, {"members": True, "exclude-members": ["model_config"]}
                )
            }
            self.assertEqual(documented["tag"], "A documented discriminator.")
            self.assertEqual(base.members["tag"].labels, {"class-attribute"})
