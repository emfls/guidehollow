"""Offline regressions for GuideHollow's site-scoped Notion publisher."""
import importlib.util
from pathlib import Path
import tempfile
import json
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
    def test_adjacent_bold_code_spans_render_as_one_markdown_run(self):
        items = [
            {"plain_text": "Use ", "annotations": {"bold": True}},
            {"plain_text": "IFNA", "annotations": {"bold": True, "code": True}},
            {"plain_text": " for missing keys", "annotations": {"bold": True}},
        ]
        self.assertEqual(publisher.safe_inline(items), "**Use `IFNA` for missing keys**")
        self.assertNotIn("****", publisher.safe_inline(items))

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
        self.assertIn("- One\n- Two\n\nSeparate paragraph", output)

    def test_notion_checklists_keep_checked_state_and_section_boundaries(self):
        items = [
            block("Before the checklist", "paragraph"),
            {"type": "to_do", "has_children": False,
             "to_do": {"checked": False, "rich_text": rich("Validate JSON syntax")}},
            {"type": "to_do", "has_children": False,
             "to_do": {"checked": True, "rich_text": rich("Compare against source")}},
            block("After the checklist", "paragraph"),
        ]
        with patch.object(publisher, "children", return_value=items):
            result = publisher.markdown("article")
        self.assertIn(
            "Before the checklist\\n\\n- [ ] Validate JSON syntax\\n"
            "- [x] Compare against source\\n\\nAfter the checklist",
            result)

    def test_malformed_or_nested_checklist_fails_closed(self):
        for item in [
            {"type": "to_do", "has_children": False,
             "to_do": {"checked": "false", "rich_text": rich("Invalid")}},
            {"type": "to_do", "has_children": True,
             "to_do": {"checked": False, "rich_text": rich("Nested")}},
        ]:
            with self.subTest(item=item), patch.object(publisher, "children", return_value=[item]):
                with self.assertRaisesRegex(ValueError, "Malformed Notion|Unsupported nested"):
                    publisher.markdown("article")

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

    def test_preflight_reports_legacy_staged_records_without_changing_them(self):
        with tempfile.TemporaryDirectory() as td:
            ledger = Path(td) / "ledger.jsonl"
            data = [{"site_id": publisher.SITE_ID, "kst_date": "2020-01-01",
                     "page_id": "old-main", "state": "staged", "url": publisher.SITE + "/guides/old/"},
                    {"site_id": "other-site", "kst_date": "2020-01-01",
                     "page_id": "other", "state": "staged"}]
            before = "".join(json.dumps(r) + "\n" for r in data)
            ledger.write_text(before)
            with patch.object(publisher, "LEDGER", ledger):
                result = publisher.publication_preflight()
                self.assertEqual(result["status"], "BLOCKED")
                self.assertEqual(result["checked_records"], 1)
                self.assertEqual(len(result["unresolved"]), 1)
                self.assertEqual(result["unresolved"][0]["page_id"], "old-main")
                self.assertEqual(ledger.read_text(), before)

    def test_prior_staged_publication_prevents_another_day_automatic_release(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            ledger = home / "ledger.jsonl"
            ledger.write_text(json.dumps({"site_id": publisher.SITE_ID,
                    "kst_date": "2020-01-01", "page_id": "stuck", "state": "staged"}) + "\n")
            with (patch.object(publisher, "LEDGER", ledger),
                  patch.object(publisher, "verify_site_registry", return_value={}),
                  patch.object(publisher, "fetch_ready") as fetch):
                with self.assertRaisesRegex(ValueError, "UNRECONCILED_LEDGER"):
                    publisher.stage()
                fetch.assert_not_called()
                self.assertEqual(len(ledger.read_text().splitlines()), 1)

    def test_finalize_rejects_missing_deployment_sha_before_writing(self):
        with patch.object(publisher, "verify_site_registry", return_value={}):
            with patch.dict("os.environ", {"PUBLISHED_COMMIT_SHA": ""}):
                with self.assertRaisesRegex(ValueError, "DEPLOYMENT_SHA_REQUIRED"):
                    publisher.finalize("test", publisher.SITE + "/guides/test/")

    def test_finalization_updates_notion_then_persists_main_ledger(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            articles = root / "src/content/articles"
            articles.mkdir(parents=True)
            slug = "safe-test"
            title = "A Test Article with a Reliable and Traceable Source"
            url = publisher.SITE + "/guides/" + slug + "/"
            (articles / (slug + ".md")).write_text('slug: "' + slug + '"')
            ledger = root / "ledger.jsonl"
            ledger.write_text(json.dumps({"site_id": publisher.SITE_ID,
                "page_id": "testid", "url": url, "title": title,
                "state": "staged", "kst_date": "2020-01-01"}) + "\n")
            props = {"properties": {"배포 사이트": {"relation": [{"id": publisher.SITE_PAGE}]},
                      "검수승인": {"checkbox": True}, "상태": {"select": {"name": "발행중"}},
                      "게시 URL": {"url": None}}}
            class Response:
                status = 200
                def __enter__(self): return self
                def __exit__(self, *args): return False
                def read(self):
                    return ('<link rel="canonical" href="' + url + '">'
                            '<article class="prose">' + title + ' Official sources</article>').encode()
            with (patch.object(publisher, "ROOT", root),
                  patch.object(publisher, "LEDGER", ledger),
                  patch.object(publisher, "verify_site_registry", return_value={}),
                  patch.object(publisher, "notion", side_effect=lambda method, route, data=None: props if method=="GET" else {}),
                  patch.object(publisher, "urlopen", return_value=Response()),
                  patch.dict("os.environ", {"PUBLISHED_COMMIT_SHA": "a"*40})):
                result = publisher.finalize("testid", url)
                self.assertEqual(result["status"], "PUBLISHED")
                saved = json.loads(ledger.read_text().strip())
                self.assertEqual(saved["state"], "published")
                self.assertEqual(saved["commit"], "a"*40)

    def test_unapproved_article_not_published(self):
        article = row()
        article["properties"]["검수승인"]["checkbox"] = False
        self.assertFalse(publisher.eligible(article))



    def test_approved_notions_images_render_accessibly_and_pin_asset_hash(self):
        from pathlib import Path
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as temp:
            with patch.object(publisher, 'ROOT', Path(temp)):
                assets = Path(temp) / 'public/visuals'
                assets.mkdir(parents=True)
                asset = assets / 'example-flow.svg'
                asset.write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 460"><title>Example</title><rect width="1200" height="460" fill="#eeeeee"/></svg>')
                figure = {
                    'type': 'image', 'has_children': False,
                    'image': {'type': 'external', 'external': {'url': publisher.SITE + '/visuals/example-flow.svg'},
                              'caption': [{'plain_text': 'Alt: A flowchart comparing the input notes with the resulting reviewed checklist.\n'
                                                         'Caption: Compare the fictional input notes with the output, then verify every factual claim.\n'
                                                         'Credit: Original editorial diagram, fictional sample data.'}]},
                }
                with patch.object(publisher, 'children', return_value=[figure]):
                    first = publisher.markdown('test-image')
                    self.assertIn('<figure class="article-visual"', first)
                    self.assertIn('alt="A flowchart comparing', first)
                    self.assertIn('width="1200" height="460"', first)
                    self.assertIn('loading="lazy"', first)
                    self.assertIn('data-asset-sha256=', first)
                    self.assertIn('Original editorial diagram', first)
                    asset.write_text(asset.read_text().replace('#eeeeee', '#dddddd'))
                    second = publisher.markdown('test-image')
                    self.assertNotEqual(first, second, 'Asset changes must change the generated source digest')

    def test_image_block_fails_closed_for_missing_credit_remote_or_unsafe_files(self):
        from pathlib import Path
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as temp:
            with patch.object(publisher, 'ROOT', Path(temp)):
                assets = Path(temp) / 'public/visuals'
                assets.mkdir(parents=True)
                asset = assets / 'sample-visual.svg'
                clean = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 460"><rect width="1200" height="460"/></svg>'
                asset.write_text(clean)
                data = {
                    'type': 'image', 'has_children': False,
                    'image': {'type': 'external', 'external': {'url': publisher.SITE + '/visuals/sample-visual.svg'},
                              'caption': [{'plain_text': 'Alt: A safe diagram of a lookup example using fictional spreadsheet data.\n'
                                                         'Caption: This diagram shows a visual explanation of the expected spreadsheet result.\n'
                                                         'Credit: Original educational SVG diagram.'}]},
                }
                from copy import deepcopy
                cases = []
                wrong_origin = deepcopy(data)
                wrong_origin['image']['external']['url'] = 'https://untrusted.example/visuals/sample-visual.svg'
                cases.append(wrong_origin)
                wrong_path = deepcopy(data)
                wrong_path['image']['external']['url'] = publisher.SITE + '/visuals/../sample-visual.svg'
                cases.append(wrong_path)
                query_url = deepcopy(data)
                query_url['image']['external']['url'] += '?token=secret'
                cases.append(query_url)
                expiring_upload = deepcopy(data)
                expiring_upload['image'] = {'type': 'file', 'file': {'url': 'https://s3.example/temporary.svg'}}
                cases.append(expiring_upload)
                no_caption = deepcopy(data)
                no_caption['image']['caption'] = []
                cases.append(no_caption)
                wrong_caption = deepcopy(data)
                wrong_caption['image']['caption'][0]['plain_text'] = 'Alt: Some text'
                cases.append(wrong_caption)
                for case in cases:
                    with self.subTest(case=case), self.assertRaisesRegex(ValueError, 'VISUAL_REVIEW_REQUIRED'):
                        publisher.approved_image_block(case)
                asset.unlink()
                with self.assertRaisesRegex(ValueError, 'VISUAL_REVIEW_REQUIRED'):
                    publisher.approved_image_block(data)
                asset.write_text(clean.replace('<rect ', '<script>alert(1)</script><rect '))
                with self.assertRaisesRegex(ValueError, 'VISUAL_REVIEW_REQUIRED'):
                    publisher.approved_image_block(data)
                asset.write_text(clean.replace('<rect ', '<rect onload="alert(1)" '))
                with self.assertRaisesRegex(ValueError, 'VISUAL_REVIEW_REQUIRED'):
                    publisher.approved_image_block(data)
                asset.write_text(clean.replace('<rect ', '<rect style="fill:red" '))
                with self.assertRaisesRegex(ValueError, 'VISUAL_REVIEW_REQUIRED'):
                    publisher.approved_image_block(data)


if __name__ == "__main__":
    unittest.main()
