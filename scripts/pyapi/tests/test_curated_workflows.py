import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


class CuratedWorkflowTests(unittest.TestCase):
    def test_data_upload_and_terminal_status_guidance(self):
        pages = json.loads((ROOT / "scripts/pyapi/pages.json").read_text())["pages"]
        prose = {
            page["page"]: "\n".join(
                section.get("prose") or "" for section in page["sections"]
            )
            for page in pages
        }
        self.assertIn("pd.DataFrame", prose["data"])
        self.assertIn('metadata_columns=["notes"]', prose["data"])
        self.assertIn("/how-tos/dataset/upload-assay", prose["data"])
        self.assertIn("terminal", prose["jobs"])
        self.assertIn("does not establish success", prose["jobs"])
