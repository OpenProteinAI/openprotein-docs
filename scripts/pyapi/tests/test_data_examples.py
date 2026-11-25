import contextlib
import io
import json
import re
import socket
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import MagicMock, patch
from zipfile import ZipFile

from openprotein.align import AlignAPI
from openprotein.data import MSA, DataAPI, Prompt
from openprotein.jobs import JobsAPI
from openprotein.models import ModelsAPI

ROOT = Path(__file__).resolve().parents[3]
FASTA = b">query\nACDEFGHIK\n>hit\nACDEFGH-K\n"
TIME = "2026-07-20T00:00:00Z"


def response(payload=None, content=b""):
    result = MagicMock(status_code=200, content=content)
    result.json.return_value = payload
    return result


def job(id, kind, status="SUCCESS"):
    return {"job_id": id, "job_type": kind, "status": status, "created_date": TIME}


class Fixture:
    def __init__(self):
        self.msas = {
            name: {
                "msa_id": name,
                "name": "Alignment",
                "source_format": "a3m",
                "num_sequences": 2,
                "created_at": TIME,
                "updated_at": TIME,
            }
            for name in ("your-msa-id", "search-msa")
        }
        self.msas["search-msa"].update(
            status="PENDING", job_id="search-msa", num_sequences=1
        )
        self.search_fasta = b""
        self.prompts = {"your-prompt-id": {"id": "your-prompt-id", "name": "Prompt"}}
        buffer = io.BytesIO()
        with ZipFile(buffer, "w") as archive:
            archive.writestr("replicate-0.fasta", FASTA)
            archive.writestr("replicate-1.fasta", b">query\nACDEFGHIK\n")
        self.replicates = buffer.getvalue()
        self.session = MagicMock()
        self.session.data = DataAPI(self.session)
        self.session.align = AlignAPI(self.session)
        self.session.jobs = JobsAPI(self.session)
        self.session.models = ModelsAPI(self.session)
        for verb in ("get", "post", "put", "patch"):
            getattr(self.session, verb).side_effect = getattr(self, verb)

    def get(self, path, **kwargs):
        if path == "v1/data/msa":
            params = kwargs["params"]
            start, limit = params["offset"], params["limit"]
            return response(
                {
                    "items": list(self.msas.values())[start : start + limit],
                    "total": len(self.msas),
                    **params,
                }
            )
        if path == "v1/data/prompts":
            return response({"items": list(self.prompts.values()), "next": None})
        if path == "v1/jobs/search-msa":
            self.msas["search-msa"]["status"] = "SUCCESS"
            return response(job("search-msa", "/align/search/mmseqs2/msa"))
        if path == "v1/jobs/sampled":
            self.prompts["sampled"]["status"] = "SUCCESS"
            return response(job("sampled", "/prompt/sample_msa"))
        if path == "v1/models/poet":
            return response(
                {
                    "model_id": "poet",
                    "dimension": 8,
                    "max_sequence_length": 100,
                    "description": {"summary": "PoET"},
                    "methods": [
                        {"path": "batch/embeddings", "outputs": ["embeddings"]}
                    ],
                }
            )
        kind, id, *suffix = path.removeprefix("v1/data/").split("/")
        if kind == "msa":
            return (
                response(self.msas[id])
                if suffix == ["metadata"]
                else response(
                    content=self.search_fasta if id == "search-msa" else FASTA
                )
            )
        if kind == "prompts":
            return (
                response(content=self.replicates)
                if suffix == ["download"]
                else response(self.prompts[id])
            )
        raise AssertionError(path)

    def post(self, path, **kwargs):
        if path == "v1/align/search/mmseqs2/msa":
            self.search_fasta = f">query\n{kwargs['data']['query']}\n".encode()
            return response(job("search-msa", "/align/search/mmseqs2/msa", "PENDING"))
        if path == "v1/data/prompts/sample_msa":
            self.prompts["sampled"] = {
                "id": "sampled",
                "job_id": "sampled",
                "status": "PENDING",
            }
            return response(job("sampled", "/prompt/sample_msa", "PENDING"))
        if path == "v1/models/poet/batch/embeddings":
            return response(job("embedding-job", path.removeprefix("v1"), "PENDING"))
        if path == "v1/data/msa":
            return response(self.msas["your-msa-id"])
        if path == "v1/data/prompts":
            return response(self.prompts["your-prompt-id"])
        raise AssertionError(path)

    def put(self, path, **kwargs):
        assert path == "v1/data/msa/your-msa-id"
        return response(self.msas["your-msa-id"] | kwargs["json"])

    def patch(self, path, **kwargs):
        assert path == "v1/data/prompts/your-prompt-id"
        return response(self.prompts["your-prompt-id"] | kwargs["json"])


class DataExamplesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        manifest = json.loads((ROOT / "scripts/pyapi/pages.json").read_text())
        data = next(page for page in manifest["pages"] if page["page"] == "data")
        cls.section = next(
            s
            for s in data["sections"]
            if s["heading"] == "Alignments and sampled prompts"
        )

    def run_example(self, code, namespace):
        def deny(*args, **kwargs):
            raise AssertionError("network forbidden")

        with (
            patch.object(socket.socket, "connect", deny),
            patch.object(socket.socket, "connect_ex", deny),
            patch.object(socket, "create_connection", deny),
            patch("openprotein.jobs.futures.time.sleep", lambda interval: None),
            contextlib.redirect_stdout(io.StringIO()),
        ):
            exec(compile(code, "<data example>", "exec"), namespace)  # noqa: S102

    def test_module_workflow_accepts_pending_resources(self):
        fixture = Fixture()
        ns = {"session": fixture.session}
        snippets = re.findall(
            r"```python\n(.*?)\n```", self.section["prose"], re.DOTALL
        )
        self.assertEqual(len(snippets), 2)
        self.run_example(snippets[0], ns)
        self.assertIsInstance(ns["msa"], MSA)
        self.assertEqual(ns["msa"].status.value, "PENDING")
        self.assertIsInstance(ns["prompt"], Prompt)
        self.assertEqual(ns["prompt"].status.value, "PENDING")
        self.assertEqual(
            fixture.session.post.call_args.kwargs["json"]["prompt_id"], "sampled"
        )
        self.run_example(snippets[1], ns)
        self.assertEqual(ns["msa"][0], ("query", ns["sequence"].decode()))
        self.assertEqual(len(ns["prompt"]), 2)
        self.assertEqual(ns["job"].id, "embedding-job")

    def test_class_and_method_examples_are_emitted_and_run(self):
        expected = {
            "openprotein.data.MSA": {
                "class",
                "create",
                "list",
                "sample_prompt",
                "to_string",
                "update",
            },
            "openprotein.data.Prompt": {
                "class",
                "create",
                "list",
                "update",
                "wait",
            },
        }
        self.assertEqual(
            {
                entry["target"]: set(entry["examples"])
                for entry in self.section["entries"]
            },
            expected,
        )
        for entry in self.section["entries"]:
            path = entry["target"]
            spec = path.rsplit(".", 1)[0]
            document = json.loads((ROOT / f"specs/{spec}.json").read_text())
            cls = next(item for item in document["entries"] if item["path"] == path)
            members = {member["name"]: member for member in cls["members"]}
            for name, code in entry["examples"].items():
                with self.subTest(path=path, target=name), TemporaryDirectory() as tmp:
                    card = cls if name == "class" else members[name]
                    self.assertIn(
                        f"```python\n{code}\n```",
                        [
                            item
                            for section in card["parsed"]
                            if section["kind"] == "examples"
                            for item in section["items"]
                        ],
                    )
                    fixture = Fixture()
                    data = fixture.session.data
                    ns = {
                        "session": fixture.session,
                        "msa": data.MSA(id="your-msa-id"),
                        "prompt": data.Prompt(id="your-prompt-id"),
                    }
                    Path(tmp, "alignment.a3m").write_bytes(FASTA)
                    with contextlib.chdir(tmp):
                        self.run_example(code, ns)
                    if name == "to_string":
                        self.assertEqual(
                            Path(tmp, "exported-alignment.a3m").read_bytes(), FASTA
                        )
