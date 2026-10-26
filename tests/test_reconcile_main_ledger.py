"""Offline tests for one-time main ledger reconciliation."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location(
    "reconcile_main_ledger", Path(__file__).resolve().parents[1] / "scripts/reconcile_main_ledger.py")
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
pub = module.pub

class ReconcileTests(unittest.TestCase):
    def test_invalid_sha_fails_closed_without_mutation(self):
        with patch.dict("os.environ", {"VERIFIED_PAGES_SHA": ""}):
            with self.assertRaisesRegex(ValueError, "RECONCILE_REQUIRES_DEPLOYED_SHA"):
                module.reconcile()

    def test_all_or_nothing_when_notion_claim_not_completed(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            (root/"src/content/articles").mkdir(parents=True)
            slug="existing-example"
            (root/"src/content/articles"/(slug+".md")).write_text('slug: "'+slug+'"')
            target = pub.SITE+"/guides/"+slug+"/"
            initial = json.dumps({"site_id":pub.SITE_ID,"state":"staged",
                   "page_id":"old","url":target,"title":"An Example Title"})+"\n"
            ledger=root/"main.jsonl";ledger.write_text(initial)
            props={"properties":{"배포 사이트":{"relation":[{"id":pub.SITE_PAGE}]},
                   "검수승인":{"checkbox":True},"상태":{"select":{"name":"발행중"}},
                   "게시 URL":{"url":target}}}
            with (patch.object(pub,"ROOT",root),patch.object(pub,"LEDGER",ledger),
                  patch.object(pub,"verify_site_registry",return_value={}),
                  patch.object(pub,"notion",return_value=props),
                  patch.dict("os.environ",{"VERIFIED_PAGES_SHA":"a"*40})):
                with self.assertRaisesRegex(ValueError,"Notion completion"):
                    module.reconcile()
                self.assertEqual(ledger.read_text(),initial)

if __name__ == "__main__":
    unittest.main()
