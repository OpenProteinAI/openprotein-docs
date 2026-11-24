import sys
import sysconfig
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from members import select
from sdk import deref, load_sdk


class InheritedFieldDocsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.package, _, _ = load_sdk(Path(sysconfig.get_paths()["purelib"]))

    def fields(self, name, options):
        cls = deref(self.package["predictor"][name])
        return {
            name: extra["doc"] for name, _, extra in select(self.package, cls, options)
        }

    def test_stationary_and_linear_inherit_declared_field_docs(self):
        options = {
            "members": True,
            "inherited-members": True,
            "exclude-members": ["model_config"],
        }
        rbf = self.fields("RBFKernel", options)
        self.assertIn("Signal variance", rbf["outputscale"])
        self.assertIn("Distance in embedding space", rbf["lengthscale"])
        linear = self.fields("LinearKernel", options)
        self.assertIn("Signal variance", linear["outputscale"])
        self.assertNotIn("lengthscale", linear)

    def test_inherited_option_exclusion_and_explicit_list(self):
        self.assertNotIn("outputscale", self.fields("RBFKernel", {"members": True}))
        self.assertNotIn(
            "outputscale",
            self.fields(
                "RBFKernel",
                {
                    "members": True,
                    "inherited-members": True,
                    "exclude-members": ["outputscale"],
                },
            ),
        )
        fields = self.fields(
            "RBFKernel", {"members": ["lengthscale"], "inherited-members": True}
        )
        self.assertEqual(set(fields), {"lengthscale"})

    def test_nearest_and_subclass_attributes_take_precedence(self):
        import tempfile

        import griffe

        source = '''
class Base:
    """Base.

    Attributes
    ----------
    value : float
        Base description.
    ghost : float
        Not a field.
    """
    value: float

class Middle(Base):
    """Middle.

    Attributes
    ----------
    value : float
        Middle description.
    """

class Leaf(Middle):
    """Leaf."""

class Own(Middle):
    """Own.

    Attributes
    ----------
    value : float
        Own description.
    """
'''
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "fixture.py"
            path.write_text(source)
            module = griffe.load(
                "fixture",
                search_paths=[directory],
                docstring_parser="numpy",
                allow_inspection=False,
            )
            options = {"members": True, "inherited-members": True}

            def docs(name):
                return {
                    name: extra["doc"]
                    for name, _, extra in select(module, module[name], options)
                }

            self.assertEqual(docs("Leaf")["value"], "Middle description.")
            self.assertEqual(docs("Own")["value"], "Own description.")
            self.assertNotIn("ghost", docs("Leaf"))
