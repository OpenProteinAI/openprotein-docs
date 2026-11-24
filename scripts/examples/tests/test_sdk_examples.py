import ast
import hashlib
import json
import re
import socket
import textwrap
import unittest
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
FIXTURE = json.loads((Path(__file__).parent / "notebook-invariants.json").read_text())


def digest(value):
    return hashlib.sha256(
        json.dumps(
            value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
        ).encode()
    ).hexdigest()


def headings(text):
    return re.findall(r"^\s*#{1,6}\s+.*$", text, re.MULTILINE)


def notebook(path):
    return json.loads((ROOT / path).read_text())


def execute(source, namespace):
    def deny(*args, **kwargs):
        raise AssertionError("network forbidden")

    with (
        patch.object(socket.socket, "connect", deny),
        patch.object(socket.socket, "connect_ex", deny),
        patch.object(socket, "create_connection", deny),
    ):
        exec(compile(source, "<example>", "exec"), namespace)  # noqa: S102


class ExamplesTest(unittest.TestCase):
    def test_parse_all_examples(self):
        count = 0
        for path in FIXTURE["mdx"]:
            blocks = re.findall(
                r"```python[^\n]*\n(.*?)```", (ROOT / path).read_text(), re.DOTALL
            )
            count += len(blocks)
            for block in blocks:
                ast.parse(textwrap.dedent(block))
        self.assertEqual(count, 32)
        count = 0
        for path in FIXTURE["notebooks"]:
            for cell in notebook(path)["cells"]:
                if cell["cell_type"] == "code":
                    ast.parse("".join(cell["source"]))
                    count += 1
        self.assertEqual(count, 103)

    def test_notebook_invariants(self):
        for path, fixture in FIXTURE["notebooks"].items():
            with self.subTest(path=path):
                nb = notebook(path)
                cells = nb["cells"]
                self.assertEqual(len(cells), fixture["count"])
                self.assertEqual(
                    digest({k: v for k, v in nb.items() if k != "cells"}),
                    fixture["metadata"],
                )
                self.assertEqual(
                    digest(
                        [
                            {
                                k: v
                                for k, v in cell.items()
                                if k not in ("source", "outputs", "execution_count")
                            }
                            for cell in cells
                        ]
                    ),
                    fixture["cell_fields"],
                )
                self.assertEqual(
                    digest(
                        [
                            headings("".join(cell["source"]))
                            for cell in cells
                            if cell["cell_type"] == "markdown"
                        ]
                    ),
                    fixture["headings"],
                )
                self.assertEqual(
                    digest(
                        [
                            cell["source"]
                            for i, cell in enumerate(cells)
                            if i not in fixture["allowed"]
                        ]
                    ),
                    fixture["source"],
                )

                def cleared(i, cell, fixture=fixture):
                    start = fixture["clear_from"]
                    return cell["cell_type"] == "code" and (
                        i in fixture.get("clear_cells", [])
                        or (start is not None and i >= start)
                    )

                self.assertEqual(
                    digest(
                        [
                            {
                                k: cell[k]
                                for k in ("outputs", "execution_count")
                                if k in cell
                            }
                            for i, cell in enumerate(cells)
                            if not cleared(i, cell)
                        ]
                    ),
                    fixture["outputs"],
                )
                for i, cell in enumerate(cells):
                    if cleared(i, cell):
                        self.assertEqual(cell["outputs"], [])
                        self.assertIsNone(cell["execution_count"])

    def test_mdx_invariants(self):
        for path, expected in FIXTURE["mdx"].items():
            with self.subTest(path=path):
                text = (ROOT / path).read_text()
                self.assertEqual(
                    digest(text.split("---", 2)[1]), expected["frontmatter"]
                )
                self.assertEqual(digest(headings(text)), expected["headings"])

    def test_notebook_collections(self):
        class Job:
            def __init__(self, sequences, scores):
                self.sequences, self.scores = sequences, scores

            def get(self, output=None):
                if output is None:
                    return self.sequences
                if output == "loglikelihood":
                    return self.scores
                raise AssertionError(f"Unknown output: {output}")

        class Value:
            def __init__(self, value):
                self.value = value

            def mean(self):
                return self

            def item(self):
                return (
                    sum(self.value) / len(self.value)
                    if isinstance(self.value, list)
                    else self.value
                )

        class Frame:
            def __init__(self, records):
                self.records = records

            @classmethod
            def from_records(cls, records):
                return cls(records)

            def set_index(self, index):
                self.index = index
                return self

            def head(self):
                return self

        paths = list(FIXTURE["notebooks"])[:2]
        for path, index, jobname in zip(
            paths, [33, 56], ["gen_jobs", "proteinmpnn_jobs"]
        ):
            source = "".join(notebook(path)["cells"][index]["source"])
            sep = "" if index == 33 else ":"
            jobs = [Job(["TARGET" + sep + "AAA", "TARGET" + sep + "BBB"], [2, [2, 4]])]
            env = {
                jobname: jobs,
                "tqdm": lambda x, **kw: x,
                "N_SEQS_PER_STRUCTURE": 2,
                "binder_scaffold": "XXX",
                "np": SimpleNamespace(asarray=Value),
                "pd": SimpleNamespace(DataFrame=Frame),
            }
            with self.subTest(path=path):
                execute(source, env)
                self.assertEqual(
                    env["records"],
                    [
                        {
                            "design_idx": 0,
                            "structure_idx": 0,
                            "sequence_idx": 0,
                            "score": 2,
                            "sequence": "AAA",
                        },
                        {
                            "design_idx": 1,
                            "structure_idx": 0,
                            "sequence_idx": 1,
                            "score": 3,
                            "sequence": "BBB",
                        },
                    ],
                )
                if index == 56:
                    cells = notebook(path)["cells"]
                    env["target"] = SimpleNamespace(sequence=b"TARGET")
                    execute("".join(cells[52]["source"]), env)
                    execute("".join(cells[54]["source"]), env)
                    self.assertEqual(env["first_design_score"], 2)
                    self.assertEqual(env["second_design_score"], 3)
                jobs[0].scores.pop()
                with self.assertRaises(ValueError):
                    execute(source, env)


def fences(path):
    return [
        textwrap.dedent(code)
        for code in re.findall(
            r"```python[^\n]*\n(.*?)```", (ROOT / path).read_text(), re.DOTALL
        )
    ]


def snippet(path, marker):
    matches = [source for source in fences(path) if marker in source]
    if len(matches) != 1:
        raise AssertionError(
            f"Expected one {marker!r} block in {path}, got {len(matches)}"
        )
    return matches[0]


MINI = "content/docs/how-tos/design/design-miniprotein-binder.mdx"
INVERSE = "content/docs/how-tos/design/inverse-folding.mdx"
TUTORIAL = "content/docs/tutorials/design/generate/inverse-folding.mdx"


class WorkflowTest(unittest.TestCase):
    def test_generation_keywords(self):
        sources = [
            source for path in (MINI, INVERSE, TUTORIAL) for source in fences(path)
        ]
        for path in FIXTURE["notebooks"]:
            sources.extend(
                "".join(cell["source"])
                for cell in notebook(path)["cells"]
                if cell["cell_type"] == "code"
            )
        modern = 0
        legacy = 0
        for source in sources:
            for call in ast.walk(ast.parse(source)):
                if not isinstance(call, ast.Call):
                    continue
                name = ast.unparse(call.func)
                params = {keyword.arg for keyword in call.keywords}
                if name.startswith("session.models.") and name.endswith(".generate"):
                    modern += 1
                    self.assertIn("num_samples", params)
                    self.assertFalse(params & {"N", "seed", None}, name)
                    self.assertFalse(any("denoiser" in str(key) for key in params))
                    if "proteinmpnn" in name and "random_seed" in source:
                        self.assertIn("random_seed", params)
                elif name == "session.embedding.poet2.generate":
                    legacy += 1
                    self.assertIn("seed", params)
                    self.assertNotIn("random_seed", params)
        self.assertGreaterEqual(modern, 8)
        self.assertEqual(legacy, 1)

    def test_inverse_folding_result_branches(self):
        class Job:
            def __init__(self, values):
                self.values = values

            def wait_until_done(self, **kwargs):
                pass

            def get(self):
                return self.values

        for branch, values in (
            ("proteinmpnn", ["AAA", "BBB", "AAA"]),
            (
                "poet2",
                [SimpleNamespace(sequence=b"AAA"), SimpleNamespace(sequence="BBB")],
            ),
        ):
            with self.subTest(branch=branch):
                calls = []

                def generate(_calls=calls, _values=values, **params):
                    _calls.append(params)
                    return Job(_values)

                session = SimpleNamespace(
                    models=SimpleNamespace(
                        proteinmpnn=SimpleNamespace(generate=generate)
                    ),
                    embedding=SimpleNamespace(poet2=SimpleNamespace(generate=generate)),
                    prompt=SimpleNamespace(get_prompt=lambda value: object()),
                )
                namespace = {"session": session, "myQuery": object()}
                marker = f"session.{'models' if branch == 'proteinmpnn' else 'embedding'}.{branch}.generate"
                execute(snippet(INVERSE, marker), namespace)
                execute(snippet(INVERSE, "dict.fromkeys(mySequences)"), namespace)
                self.assertEqual(namespace["mySequences"], ["AAA", "BBB"])
                self.assertEqual(len(calls), 1)
                self.assertIn(
                    "random_seed" if branch == "proteinmpnn" else "seed", calls[0]
                )

    def test_tutorial_string_records(self):
        namespace = {"results": ["AAA", "BBB", "AAA"]}
        execute(snippet(TUTORIAL, "ubiquitin_design_"), namespace)
        self.assertEqual(
            namespace["records"],
            [
                {"name": f"ubiquitin_design_{i:02d}", "sequence": sequence}
                for i, sequence in enumerate(["AAA", "BBB", "AAA"], 1)
            ],
        )

    def test_wrapper_paths_and_prerequisites(self):
        for path in FIXTURE["notebooks"]:
            relative = path.removeprefix("content/notebooks/")
            wrapper = ROOT / "content/docs" / Path(relative).with_suffix(".mdx")
            self.assertIn(f"notebook: {relative}", wrapper.read_text())
            intro = "".join(
                "".join(cell["source"]) for cell in notebook(path)["cells"][:2]
            )
            self.assertIn(">=0.18.0", intro)
        poet = next(
            path
            for path in FIXTURE["notebooks"]
            if path.endswith("/PoET-2_inverse_folding.ipynb")
        )
        self.assertIn(
            "from openprotein.molecules import Protein",
            "".join(notebook(poet)["cells"][2]["source"]),
        )

    def test_notebook_sample_budgets(self):
        for path, cell_index in zip(
            list(FIXTURE["notebooks"])[:2], (31, 50), strict=True
        ):
            cells = notebook(path)["cells"]
            source = "\n".join(
                "".join(cell["source"]) for cell in cells if cell["cell_type"] == "code"
            )
            constants = {
                target.id: node.value.value
                for node in ast.walk(ast.parse(source))
                if isinstance(node, ast.Assign) and isinstance(node.value, ast.Constant)
                for target in node.targets
                if isinstance(target, ast.Name)
            }
            self.assertEqual(constants["N_STRUCTURES"], 100)
            self.assertEqual(constants["N_SEQS_PER_STRUCTURE"], 10)
            loops = [
                node
                for node in ast.parse("".join(cells[cell_index]["source"])).body
                if isinstance(node, ast.For)
            ]
            submissions = [
                node
                for node in ast.walk(loops[0])
                if isinstance(node, ast.Call)
                and ast.unparse(node.func) == "session.models.proteinmpnn.generate"
            ]
            self.assertEqual(len(submissions), 1)

    def test_network_guard(self):
        with self.assertRaisesRegex(AssertionError, "network forbidden"):
            execute("import socket\nsocket.create_connection(('127.0.0.1', 1))", {})

    def test_miniprotein_attribution(self):
        class Protein:
            def __init__(self, sequence, index):
                self.sequence = sequence.encode()
                self.index = index
                self.masked = False
                self.side_chain_masked = False
                self.plddt = SimpleNamespace(mean=lambda: 90.0)

            def copy(self):
                return Protein(self.sequence.decode(), self.index)

            def mask_sequence(self):
                self.masked = True
                return self

            def mask_structure(self, side_chain_only=False):
                self.side_chain_masked = side_chain_only
                return self

            def rmsd(self, other):
                if self.index != other.index:
                    raise AssertionError("backbone attribution")
                return 1.0

        class Complex:
            def __init__(self, index):
                self.index = index
                self.chains = {
                    "A": Protein("TARGET", index),
                    "B": Protein("X" * 80, index),
                }

            def copy(self):
                return Complex(self.index)

            def get_protein(self, chain):
                return self.chains[chain]

            def set_chain(self, chain, protein):
                self.chains[chain] = protein

            def rmsd(self, other):
                return self.chains["B"].rmsd(other.chains["B"])

        class Job:
            def __init__(self, values):
                self.values = values

            def wait_until_done(self, **kwargs):
                pass

            def get(self):
                return self.values

        backbones = [Complex(i) for i in range(5)]
        calls = []
        sample_count = [None]

        def generate(*, query, num_samples, temperature):
            self.assertEqual(num_samples, 5)
            self.assertTrue(query.chains["B"].masked)
            self.assertTrue(query.chains["B"].side_chain_masked)
            self.assertFalse(query.chains["A"].masked)
            calls.append(query)
            count = num_samples if sample_count[0] is None else sample_count[0]
            return Job(["TARGET:" + "ACDEG"[query.index] * 80] * count)

        namespace: dict[str, Any] = {
            "session": SimpleNamespace(
                models=SimpleNamespace(
                    rfdiffusion=SimpleNamespace(generate=lambda **kw: Job(backbones)),
                    proteinmpnn=SimpleNamespace(generate=generate),
                )
            ),
            "myQuery": object(),
            "N_STRUCTURES": 5,
            "N_SEQUENCES": 5,
            "myTarget": Protein("TARGET", 0),
        }
        generation = snippet(MINI, "structure_job = session.models.rfdiffusion")
        execute(generation, namespace)
        execute(snippet(MINI, "target_sequence, separator"), namespace)
        self.assertEqual(len(calls), 5)
        self.assertEqual(len(namespace["myDesigns"]), 25)
        self.assertEqual(len(namespace["mySequences"]), 25)
        self.assertTrue(all(not backbone.chains["B"].masked for backbone in backbones))
        for (index, _), sequence in zip(
            namespace["myDesigns"], namespace["mySequences"], strict=True
        ):
            self.assertIs(namespace["myBackbones"][index], backbones[index])
            self.assertEqual(sequence, "ACDEG"[index] * 80)

        class Frame:
            def __init__(self, rows):
                self.rows = rows
                self.shape = (len(rows), len(rows[0]))
                self.columns = list(rows[0])

        ipaes = [SimpleNamespace(item=lambda: 2.0) for _ in range(25)]
        namespace.update(
            myPredictions=[Complex(index) for index, _ in namespace["myDesigns"]],
            fold_job=SimpleNamespace(get_ipae=lambda: ipaes),
            pd=SimpleNamespace(DataFrame=Frame),
        )
        metrics = snippet(MINI, "myMetrics = []")
        execute(metrics, namespace)
        self.assertEqual(namespace["myLibrary"].shape, (25, 6))
        self.assertEqual(
            namespace["myLibrary"].columns,
            [
                "backbone_index",
                "sequence",
                "rmsd",
                "binder_rmsd",
                "ipae",
                "binder_plddt",
            ],
        )
        namespace["myBackbones"][0] = backbones[1]
        with self.assertRaisesRegex(AssertionError, "backbone attribution"):
            execute(metrics, namespace)
        namespace["myBackbones"][0] = backbones[0]
        namespace["myPredictions"].pop()
        with self.assertRaises(ValueError):
            execute(metrics, namespace)
        namespace["N_STRUCTURES"] = 6
        with self.assertRaises(AssertionError):
            execute(generation, namespace)
        namespace["N_STRUCTURES"] = 5
        sample_count[0] = 4
        with self.assertRaises(AssertionError):
            execute(generation, namespace)


if __name__ == "__main__":
    unittest.main()
