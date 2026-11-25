import ast
import json
import unittest
from importlib.metadata import distribution
from pathlib import Path


def module(relative):
    path = distribution("openprotein-python").locate_file("openprotein/" + relative)
    return ast.parse(path.read_text(encoding="utf-8"))


def definition(parent, name):
    return next(
        node
        for node in parent.body
        if isinstance(node, (ast.ClassDef, ast.FunctionDef)) and node.name == name
    )


RELEASE = json.loads(
    (Path(__file__).resolve().parents[1] / "release-contract.json").read_text()
)


def release_definition(row):
    node = module(row["file"].removeprefix("openprotein/"))
    for part in row["qualname"].split("."):
        node = definition(node, part)
    return node


class ReleaseSourceContractTests(unittest.TestCase):
    def test_fit_future_overloads_and_named_output_dispatch(self):
        fit = release_definition(
            next(
                row
                for row in RELEASE["symbols"]
                if row["public"] == "openprotein.jobs.FitFuture"
            )
        )
        for name in ("get", "wait"):
            methods = [
                node
                for node in fit.body
                if isinstance(node, ast.FunctionDef) and node.name == name
            ]
            self.assertEqual(len(methods), 3)
            overloads = methods[:2]
            self.assertEqual(
                [ast.unparse(method.returns) for method in overloads],
                ["_M", "list[Any]"],
            )
            self.assertEqual(
                [
                    ast.unparse(
                        next(
                            arg.annotation
                            for arg in method.args.args
                            if arg.arg == "output"
                        )
                    )
                    for method in overloads
                ],
                ["None", "str | None"],
            )
            self.assertIn("output", [arg.arg for arg in methods[2].args.args])
            self.assertIn("output=output", ast.unparse(methods[2]))
        self.assertIn(
            "kwargs.get('output') is not None", ast.unparse(definition(fit, "_get"))
        )
        self.assertIn("return self._fitted()", ast.unparse(definition(fit, "_get")))

    def test_compatibility_job_and_deprecation_stay_in_source(self):
        prompt_post = definition(module("align/api.py"), "prompt_post")
        self.assertEqual(ast.unparse(prompt_post.returns), "Job")
        doc = ast.get_docstring(prompt_post) or ""
        self.assertIn("deprecated:: 0.18.0", doc)
        self.assertIn("MSAFuture.sample_prompt", doc)
        self.assertIn("or `MSA.sample_prompt`", doc)
        self.assertIn("removed_in='0.19.0'", ast.unparse(prompt_post))
        msa_id = definition(definition(module("align/schemas.py"), "MSAJob"), "msa_id")
        self.assertIn("or self.job_id", ast.unparse(msa_id))

    def test_protein_and_fold_chain_contracts_in_source(self):
        protein = definition(module("molecules/protein.py"), "Protein")
        for name in ("msa", "get_msa"):
            self.assertIn(" | MSA | ", ast.unparse(definition(protein, name).returns))
        setter = definition(protein, "set_msa")
        self.assertIn(" | MSA | ", ast.unparse(setter.args.args[1].annotation))
        chain_ids = release_definition(RELEASE["foldHelper"])
        doc = ast.get_docstring(chain_ids) or ""
        self.assertIn("request order with copies expanded", doc)
        self.assertIn("fold outputs", doc)

    def test_stored_data_aliases_resolve_to_their_public_homes(self):
        import json
        import sys
        import sysconfig
        from pathlib import Path

        sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
        from generate import build_resolver
        from sdk import load_sdk

        package, _, _ = load_sdk(Path(sysconfig.get_paths()["purelib"]))
        pages = json.loads(
            (Path(__file__).resolve().parents[1] / "pages.json").read_text()
        )
        resolve, _ = build_resolver(package, pages)
        self.assertEqual(
            resolve("openprotein.data.msa.MSA"),
            {"path": "openprotein.data.MSA", "page": "data"},
        )
        self.assertEqual(
            resolve("openprotein.data.AssayDataset"),
            {"path": "openprotein.data.Assay", "page": "data"},
        )
        self.assertIsNone(resolve("openprotein.data.msa.NoSuchClass"))
