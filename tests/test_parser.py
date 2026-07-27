import os
import tempfile
import unittest
from pathlib import Path

TEST_DATA = tempfile.TemporaryDirectory()
os.environ["REQ_RADAR_DATA_DIR"] = TEST_DATA.name

from app import compare_jobs, extract_pdf_text, parse_job_text  # noqa: E402


class ParserTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.sample_path = Path(__file__).resolve().parents[1] / "sample" / "sample-job.pdf"
        cls.text = extract_pdf_text(cls.sample_path.read_bytes())
        cls.job = parse_job_text(cls.text, cls.sample_path.name)

    def test_core_fields(self):
        self.assertEqual(self.job["job_id"], "22641")
        self.assertEqual(self.job["title"], "Principal, Business Operations, Customer Success")
        self.assertEqual(self.job["hiring_manager"], "Emilie Fournier")
        self.assertIn("San Diego, California", self.job["locations"])

    def test_sections_and_skills(self):
        self.assertGreaterEqual(len(self.job["responsibilities"]), 6)
        self.assertGreaterEqual(len(self.job["qualifications"]), 5)
        self.assertIn("Strategic planning", self.job["skills"])
        self.assertIn("Stakeholder management", self.job["skills"])

    def test_comparison(self):
        related = dict(self.job)
        related["id"] = "related"
        related["job_id"] = "OTHER-1"
        related["title"] = "Principal, Business Operations, Customer Success Strategy"
        result = compare_jobs(self.job, related)
        self.assertGreaterEqual(result["overall"], 80)
        self.assertGreaterEqual(result["title_similarity"], 80)


if __name__ == "__main__":
    unittest.main()
