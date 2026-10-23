"""Offline regressions for GuideHollow's site-scoped Notion publisher."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

FILE = Path(__file__).resolve().parents[1] / "scripts/notion_publish_daily.py"
spec = importlib.util.spec_from_file_location("notion_daily_publisher", FILE)
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


def rich(t):
    return [{"plain_text": t, "annotations": {}}]


def block(t, kind="paragraph"):
    return {"type": kind, "has_children": False, kind: {"rich_text": rich(t)}}


def row(page_id="approved-page"):
    return {
        "id": page_id,
        "properties": {
            "배포 사이트": {"relation": [{"id": publisher.SITE_PAGE}]},
            "검수승인": {"checkbox": True},
            "제목": {"type": "title", "title": rich("How to Extract Meeting Action Items with AI Without Inventing Deadlines")},
            "슬러그": {"type": "rich_text", "rich_text": rich("extract-meeting-action-items-with-ai")},
            "설명": {"type": "rich_text", "rich_text": rich("Turn approved meeting notes into a reliable AI-assisted action tracker without fabricating owners, due dates, or decisions.")},
            "카테고리": {"select": {"name": "guides"}},
            "태그": {"type": "rich_text", "rich_text": rich("productivity, verification, prompting")},
            "공식출처": {"type": "rich_text", "rich_text": rich("https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt")},
            "발행예정일": {"date": None},
        },
    }


class PublisherTests(unittest.TestCase):
    def test_inline_escapes_html_and_preserves_bold(self):
        self.assertEqual(publisher.safe_inline(rich("<script>")), "&lt;script&gt;")
        self.assertEqual(publisher.safe_inline([{"plain_text": "Important", "annotations": {"bold": True}}]), "**Important**")

    def test_markdown_supports_code_and_tables(self):
        t = {"type": "table", "has_children": True, "id": "table-1", "table": {}}
        table_rows = [
            {"type": "table_row", "table_row": {"cells": [rich("Action"), rich("Owner")]}},
            {"type": "table_row", "table_row": {"cells": [rich("Draft"), rich("Not specified")]}},
        ]
        code = {"type": "code", "has_children": False,
                "code": {"language": "plain text", "rich_text": rich("hello\nworld")}}
        def children(key):
            return table_rows if key == "table-1" else [block("Sample", "heading_2"), code, t]
        with patch.object(publisher, "children", side_effect=children):
            output = publisher.markdown("article-id")
        self.assertIn("## Sample", output)
        self.assertIn("hello\nworld", output)
        self.assertIn("| Action | Owner |", output)
        self.assertIn("| Draft | Not specified |", output)

    def test_lists_do_not_absorb_following_paragraphs(self):
        blocks = [block("One", "bulleted_list_item"), block("Two", "bulleted_list_item"),
                  block("Separate paragraph", "paragraph")]
        with patch.object(publisher, "children", return_value=blocks):
            output = publisher.markdown("id")
        self.assertIn("- One\\n- Two\\n\\nSeparate paragraph", output)

    def test_notion_normalized_internal_links_restore_site_paths(self):
        item = {"plain_text": "Prompt Builder",
                "href": "https://app.notion.com/tools/ai-prompt-builder/",
                "annotations": {}}
        self.assertEqual(publisher.safe_inline([item]),
                         "[Prompt Builder](/tools/ai-prompt-builder/)")

    def test_unrecognized_blocks_fail_closed(self):
        with patch.object(publisher, "children", return_value=[{"type":"child_page", "child_page":{}, "has_children":False}]):
            with self.assertRaisesRegex(ValueError, "Unsupported block"):
                publisher.markdown("id")

    def test_unrelated_site_is_ignored(self):
        article = row()
        article["properties"]["배포 사이트"]["relation"][0]["id"] = "different-site"
        self.assertFalse(publisher.eligible(article))

    def test_approved_article_stages_once_per_kst_date(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            (home / "src/content/articles").mkdir(parents=True)
            with patch.object(publisher, "ROOT", home), \
                 patch.object(publisher, "LEDGER", home/"data"/"guidehollow-publication-ledger.jsonl"), \
                 patch.object(publisher, "verify_site_registry", return_value={}), \
                 patch.object(publisher, "fetch_ready", return_value=[row()]), \
                 patch.object(publisher, "markdown", return_value=("Word " * 600)), \
                 patch.object(publisher, "notion", return_value={}):
                first = publisher.stage()
                second = publisher.stage()
                self.assertEqual(first["status"], "STAGED")
                self.assertEqual(second["status"], "ALREADY_STAGED_TODAY")
                generated = home / first["file"]
                self.assertTrue(generated.is_file())
                self.assertIn("slug: \"extract-meeting-action-items-with-ai\"", generated.read_text())
                self.assertEqual(len((home/"data/guidehollow-publication-ledger.jsonl").read_text().splitlines()), 1)

    def test_unapproved_article_not_published(self):
        article = row()
        article["properties"]["검수승인"]["checkbox"] = False
        self.assertFalse(publisher.eligible(article))


if __name__ == "__main__":
    unittest.main()
