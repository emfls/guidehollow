"""Pages failure/delay regressions without starting a real release."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("pages", Path(__file__).resolve().parents[1]/"scripts/verify_pages_deployment.py")
pages = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pages)
SHA = "a" * 40

class PagesTests(unittest.TestCase):
    def verify(self, batches):
        with (patch.object(pages.subprocess, "check_output", side_effect=[json.dumps(b) for b in batches]),
              patch.object(pages.time, "sleep"), patch.object(pages, "ATTEMPTS", len(batches)),
              patch.dict("os.environ", {"GITHUB_REPOSITORY": "emfls/guidehollow"})):
            return pages.verify(SHA)

    def test_delay_then_exact_sha_success(self):
        self.assertEqual(self.verify([[], [{"headSha": SHA,"event":"workflow_dispatch","status":"in_progress","conclusion":""}],
            [{"headSha":SHA,"event":"workflow_dispatch","status":"completed","conclusion":"success"}]]), SHA)

    def test_other_sha_or_pr_success_never_proves_deployment(self):
        for run in [{"headSha":"b"*40,"event":"workflow_dispatch","conclusion":"success","status":"completed"},
                    {"headSha":SHA,"event":"pull_request","conclusion":"success","status":"completed"}]:
            with self.subTest(run=run), self.assertRaisesRegex(RuntimeError,"PAGES_DEPLOYMENT_TIMEOUT"):
                self.verify([[run]])

    def test_failed_cancelled_or_timed_out_deploy_stops(self):
        for conclusion in ("failure", "cancelled", "timed_out"):
            with self.subTest(conclusion=conclusion), self.assertRaisesRegex(RuntimeError,"PAGES_DEPLOYMENT_FAILED"):
                self.verify([[{"headSha":SHA,"event":"workflow_dispatch","status":"completed","conclusion":conclusion}]])

    def test_newer_failure_is_not_hidden_by_older_success(self):
        with self.assertRaisesRegex(RuntimeError, "PAGES_DEPLOYMENT_FAILED"):
            self.verify([[{"headSha":SHA,"event":"workflow_dispatch","status":"completed","conclusion":"failure"},
                          {"headSha":SHA,"event":"workflow_dispatch","status":"completed","conclusion":"success"}]])

    def test_api_outage_stops(self):
        with (patch.object(pages.subprocess,"check_output",side_effect=OSError("GitHub unavailable")),
              patch.dict("os.environ", {"GITHUB_REPOSITORY": "emfls/guidehollow"})):
            with self.assertRaises(OSError): pages.verify(SHA)
