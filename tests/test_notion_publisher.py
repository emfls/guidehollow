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
            "배포 사이트": {"type": "relation", "relation": [{"id": publisher.SITE_PAGE}]},
            "검수승인": {"type": "checkbox", "checkbox": True},
            "제목": {"type": "title", "title": rich("How to Extract Meeting Action Items with AI Without Inventing Deadlines")},
            "슬러그": {"type": "rich_text", "rich_text": rich("extract-meeting-action-items-with-ai")},
            "설명": {"type": "rich_text", "rich_text": rich("Turn approved meeting notes into a reliable AI-assisted action tracker without fabricating owners, due dates, or decisions.")},
            "카테고리": {"type": "select", "select": {"name": "guides"}},
            "태그": {"type": "rich_text", "rich_text": rich("productivity, verification, prompting")},
            "공식출처": {"type": "rich_text", "rich_text": rich("https://help.openai.com/en/articles/10032626-prompt-engineering-best-practices-for-chatgpt")},
            "발행예정일": {"type": "date", "date": None},
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
            "Before the checklist\n\n- [ ] Validate JSON syntax\n"
            "- [x] Compare against source\n\nAfter the checklist",
            result)

    def test_malformed_or_nested_checklist_fails_closed(self):
        for item in [
            {"type": "to_do", "has_children": False,
             "to_do": {"checked": "false", "rich_text": rich("Invalid")}},
            {"type": "to_do", "has_children": True,
             "to_do": {"checked": False, "rich_text": rich("Nested")}},
        ]:
            with self.subTest(item=item), patch.object(publisher, "children", return_value=[item]):
                error = RuntimeError if not isinstance(item["to_do"]["checked"], bool) else publisher.ArticleValidationError
                with self.assertRaises(error):
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
                with self.assertRaisesRegex(ValueError, "UNRECONCILED_LEDGER"):
                    publisher.stage()
                self.assertEqual(first["status"], "STAGED")
                self.assertEqual(first["slot"], "morning")
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
            props = {"properties": {"배포 사이트": {"type": "relation", "relation": [{"id": publisher.SITE_PAGE}]},
                      "검수승인": {"type": "checkbox", "checkbox": True}, "상태": {"select": {"name": "발행중"}},
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

    def test_post_commit_notion_failure_keeps_staged_ledger_and_blocks_next_release(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            articles = home / "src/content/articles"
            articles.mkdir(parents=True)
            (articles / "safe-test.md").write_text('slug: "safe-test"')
            ledger = home / "ledger.jsonl"
            url = publisher.SITE + "/guides/safe-test/"
            before = json.dumps({"site_id": publisher.SITE_ID, "page_id": "testid", "url": url,
                                 "title": "Safe Test Title", "state": "staged", "kst_date": "2020-01-01"}) + "\n"
            ledger.write_text(before)
            props = {"properties": {"배포 사이트": {"type": "relation", "relation": [{"id": publisher.SITE_PAGE}]},
                "검수승인": {"type": "checkbox", "checkbox": True}, "상태": {"select": {"name": "발행중"}}, "게시 URL": {"url": None}}}
            class Response:
                status = 200
                def __enter__(self): return self
                def __exit__(self, *args): return False
                def read(self): return ('<link rel="canonical" href="'+url+'"><article class="prose">Safe Test Title Official sources</article>').encode()
            def api(method, route, payload=None):
                if method == "PATCH": raise TimeoutError("Notion completion uncertain")
                return props
            with (patch.object(publisher, "ROOT", home), patch.object(publisher, "LEDGER", ledger),
                  patch.object(publisher, "verify_site_registry", return_value={}),
                  patch.object(publisher, "notion", side_effect=api),
                  patch.object(publisher, "urlopen", return_value=Response()),
                  patch.dict("os.environ", {"PUBLISHED_COMMIT_SHA": "a"*40})):
                with self.assertRaises(TimeoutError): publisher.finalize("testid", url)
                self.assertEqual(ledger.read_text(), before)
                with self.assertRaisesRegex(ValueError, "UNRECONCILED_LEDGER"): publisher.stage()
                # A delayed or failed live check also leaves the committed staged row intact.
                with patch.object(publisher, "urlopen", side_effect=TimeoutError("Pages delayed")):
                    with self.assertRaises(TimeoutError): publisher.finalize("testid", url)
                self.assertEqual(ledger.read_text(), before)

    def test_three_daily_slots_and_same_slot_idempotency(self):
        today = publisher.datetime.now(publisher.ZoneInfo("Asia/Seoul")).date().isoformat()
        history = [
            {"site_id": publisher.SITE_ID, "kst_date": today, "slot": "morning", "state": "published"},
            {"site_id": publisher.SITE_ID, "kst_date": today, "slot": "afternoon", "state": "published"},
        ]
        with patch.dict("os.environ", {"PUBLISH_SLOT": "morning"}):
            self.assertEqual(publisher.resolve_slot(history, today)[1], "SLOT_ALREADY_USED")
        with patch.dict("os.environ", {"PUBLISH_SLOT": "evening"}):
            self.assertEqual(publisher.resolve_slot(history, today), ("evening", None))
        with patch.dict("os.environ", {"PUBLISH_SLOT": "manual"}):
            self.assertEqual(publisher.resolve_slot(history, today), ("evening", None))
        history.append({"site_id": publisher.SITE_ID, "kst_date": today,
                        "slot": "evening", "state": "published"})
        self.assertEqual(publisher.resolve_slot(history, today)[1], "DAILY_LIMIT_REACHED")

    def test_invalid_draft_moves_to_failure_then_next_valid_draft_stages(self):
        bad, good = row("bad-item"), row("good-item")
        bad["properties"]["슬러그"]["rich_text"] = rich("INVALID SLUG")
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            (home / "src/content/articles").mkdir(parents=True)
            calls = []
            def notion_call(method, route, payload=None):
                calls.append((method, route, payload))
                return {}
            with (patch.object(publisher, "ROOT", home),
                  patch.object(publisher, "LEDGER", home/"ledger.jsonl"),
                  patch.object(publisher, "verify_site_registry", return_value={}),
                  patch.object(publisher, "fetch_ready", return_value=[bad, good]),
                  patch.object(publisher, "markdown", return_value="Word " * 600),
                  patch.object(publisher, "notion", side_effect=notion_call),
                  patch.dict("os.environ", {"PUBLISH_SLOT": "morning", "GUIDEHOLLOW_VALIDATE_BUILD": "0"})):
                result = publisher.stage()
                self.assertEqual(result["status"], "STAGED")
                self.assertEqual(result["failed_before_selection"], 1)
                self.assertEqual(result["page_id"], "good-item")
                self.assertEqual(len((home/"ledger.jsonl").read_text().splitlines()), 1)
                self.assertEqual(calls[0][1], "/pages/bad-item")
                self.assertEqual(calls[0][2]["properties"]["상태"]["select"]["name"], "실패")
                self.assertIn("Unsafe article slug", calls[0][2]["properties"]["오류"]["rich_text"][0]["text"]["content"])
                self.assertEqual(calls[-1][1], "/pages/good-item")
                self.assertEqual(calls[-1][2]["properties"]["상태"]["select"]["name"], "발행중")

    def test_bad_article_can_be_corrected_and_requeued_for_later_slot(self):
        draft = row("correctable-item")
        draft["properties"]["태그"]["rich_text"] = rich("BAD TAG")
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            (home / "src/content/articles").mkdir(parents=True)
            ledger = home / "ledger.jsonl"
            updates = []
            def notion_call(method, route, payload=None):
                updates.append(payload)
                return {}
            with (patch.object(publisher, "ROOT", home),
                  patch.object(publisher, "LEDGER", ledger),
                  patch.object(publisher, "verify_site_registry", return_value={}),
                  patch.object(publisher, "fetch_ready", return_value=[draft]),
                  patch.object(publisher, "markdown", return_value="Word " * 600),
                  patch.object(publisher, "notion", side_effect=notion_call),
                  patch.dict("os.environ", {"PUBLISH_SLOT": "morning", "GUIDEHOLLOW_VALIDATE_BUILD": "0"})):
                result = publisher.stage()
                self.assertEqual(result["status"], "ALL_CANDIDATES_FAILED")
                self.assertFalse(ledger.exists())
                self.assertEqual(updates[-1]["properties"]["상태"]["select"]["name"], "실패")
                # Editor repairs the text and explicitly changes 상태 back to 발행대기.
                draft["properties"]["태그"]["rich_text"] = rich("safe-tag")
                result = publisher.stage()
                self.assertEqual(result["status"], "STAGED")
                self.assertEqual(result["page_id"], "correctable-item")
                self.assertEqual(updates[-1]["properties"]["오류"]["rich_text"], [])

    def test_future_dated_article_does_not_block_due_article(self):
        future, due = row("future"), row("due")
        future["properties"]["발행예정일"]["date"] = {"start": "2099-01-01"}
        with tempfile.TemporaryDirectory() as td:
            home=Path(td)
            (home / "src/content/articles").mkdir(parents=True)
            with (patch.object(publisher, "ROOT", home),
                  patch.object(publisher, "LEDGER", home/"ledger.jsonl"),
                  patch.object(publisher, "verify_site_registry", return_value={}),
                  patch.object(publisher, "fetch_ready", return_value=[future, due]),
                  patch.object(publisher, "markdown", return_value="Word " * 600),
                  patch.object(publisher, "notion", return_value={}),
                  patch.dict("os.environ", {"PUBLISH_SLOT": "evening", "GUIDEHOLLOW_VALIDATE_BUILD": "0"})):
                self.assertEqual(publisher.stage()["page_id"], "due")

    def test_build_failure_quarantines_candidate_and_tries_next(self):
        first, second = row("bad-build"), row("passes-build")
        first["properties"]["슬러그"]["rich_text"] = rich("bad-build-slug")
        second["properties"]["슬러그"]["rich_text"] = rich("passes-build-slug")
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            (home / "src/content/articles").mkdir(parents=True)
            calls = []
            with (patch.object(publisher, "ROOT", home),
                  patch.object(publisher, "LEDGER", home/"ledger.jsonl"),
                  patch.object(publisher, "verify_site_registry", return_value={}),
                  patch.object(publisher, "fetch_ready", return_value=[first, second]),
                  patch.object(publisher, "markdown", return_value="Word " * 600),
                  patch.object(publisher, "verify_candidate_build",
                               side_effect=[publisher.ArticleValidationError("Candidate Astro validation failed"), None]),
                  patch.object(publisher, "notion", side_effect=lambda method, route, payload=None:
                               calls.append((route, payload)) or {}),
                  patch.dict("os.environ", {"PUBLISH_SLOT": "afternoon"})):
                result = publisher.stage()
                self.assertEqual(result["page_id"], "passes-build")
                self.assertFalse((home/"src/content/articles/bad-build-slug.md").exists())
                self.assertEqual(calls[0][1]["properties"]["상태"]["select"]["name"], "실패")

    def test_incomplete_notion_block_response_is_infrastructure_error(self):
        for batch in ({}, {"results": None}, {"results": [], "has_more": True, "next_cursor": None}):
            with self.subTest(batch=batch), patch.object(publisher, "notion", return_value=batch):
                with self.assertRaisesRegex(RuntimeError, "NOTION_RESPONSE_INVALID"):
                    publisher.children("test")

    def test_pagination_shape_and_repeated_cursor_stop_in_both_readers(self):
        for reader in (lambda: publisher.children("test"), publisher.fetch_ready):
            for batch in ({"results": []}, {"results": [], "has_more": "false"},
                          {"results": [], "has_more": True, "next_cursor": 42}):
                with self.subTest(batch=batch), patch.object(publisher, "notion", return_value=batch):
                    with self.assertRaisesRegex(RuntimeError, "NOTION_RESPONSE_INVALID"): reader()
            repeated = {"results": [], "has_more": True, "next_cursor": "same"}
            with patch.object(publisher, "notion", side_effect=[repeated, repeated]):
                with self.assertRaisesRegex(RuntimeError, "NOTION_RESPONSE_INVALID"): reader()

    def test_notion_color_annotation_remains_valid_transport_data(self):
        item = {"plain_text": "Reviewed", "annotations": {"bold": True, "color": "default"}}
        self.assertEqual(publisher.safe_inline([item]), "**Reviewed**")

    def test_malformed_notion_json_is_infrastructure_error(self):
        from io import BytesIO
        for body in (b"not json", b"[]"):
            with (self.subTest(body=body), patch.dict("os.environ", {"NOTION_API_TOKEN": "test-only"}),
                  patch.object(publisher, "urlopen", return_value=BytesIO(body))):
                with self.assertRaisesRegex(RuntimeError, "NOTION_RESPONSE_INVALID"):
                    publisher.notion("GET", "/blocks/test/children")

    def test_generic_build_failure_is_not_article_failure(self):
        from subprocess import CompletedProcess
        with (patch.dict("os.environ", {"GUIDEHOLLOW_VALIDATE_BUILD": "1"}),
              patch.object(publisher.subprocess, "run", return_value=CompletedProcess(
                  ["npm"], 1, "", "npm error ENOSPC: no space left on device"))):
            with self.assertRaisesRegex(RuntimeError, "BUILD_INFRASTRUCTURE_OR_UNKNOWN"):
                publisher.verify_candidate_build(Path("candidate.md"))

    def test_attributable_article_build_failure_can_be_quarantined(self):
        from subprocess import CompletedProcess
        with (patch.dict("os.environ", {"GUIDEHOLLOW_VALIDATE_BUILD": "1"}),
              patch.object(publisher.subprocess, "run", return_value=CompletedProcess(
                  ["npm"], 1, "", "AssertionError: guides/candidate/index.html: broken internal link /missing/"))):
            with self.assertRaisesRegex(ValueError, "Candidate Astro validation failed"):
                publisher.verify_candidate_build(Path("candidate.md"))

    def test_queue_order_gaps_do_not_require_contiguous_numbers(self):
        first, third = row("first"), row("third")
        first["properties"]["발행순서"] = {"number": 1}
        third["properties"]["발행순서"] = {"number": 3}
        with patch.object(publisher, "notion", return_value={"results": [first, third], "has_more": False}):
            self.assertEqual([r["id"] for r in publisher.fetch_ready()], ["first", "third"])

    def test_infrastructure_errors_abort_without_quarantining_or_next_selection(self):
        from urllib.error import URLError
        from subprocess import TimeoutExpired
        errors = [TimeoutError("slow Notion"), URLError("Notion unavailable"),
                  RuntimeError("NOTION_RESPONSE_INVALID"),
                  TimeoutExpired("npm", 240), FileNotFoundError("npm missing")]
        for error in errors:
            with self.subTest(error=type(error).__name__), tempfile.TemporaryDirectory() as td:
                home = Path(td)
                (home / "src/content/articles").mkdir(parents=True)
                with (patch.object(publisher, "ROOT", home),
                      patch.object(publisher, "LEDGER", home/"ledger.jsonl"),
                      patch.object(publisher, "verify_site_registry", return_value={}),
                      patch.object(publisher, "fetch_ready", return_value=[row("one"), row("two")]),
                      patch.object(publisher, "markdown", side_effect=error) as render,
                      patch.object(publisher, "notion") as api):
                    with self.assertRaises(type(error)):
                        publisher.stage()
                    self.assertEqual(render.call_count, 1)
                    api.assert_not_called()
                    self.assertFalse((home/"ledger.jsonl").exists())

    def test_previously_published_notion_page_is_not_marked_failed_or_republished(self):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            ledger = home / "ledger.jsonl"
            before = json.dumps({"site_id": publisher.SITE_ID, "page_id": "already-live",
                                 "state": "published", "kst_date": "2020-01-01"}) + "\n"
            ledger.write_text(before)
            with (patch.object(publisher, "ROOT", home), patch.object(publisher, "LEDGER", ledger),
                  patch.object(publisher, "verify_site_registry", return_value={}),
                  patch.object(publisher, "fetch_ready", return_value=[row("already-live"), row("next")]),
                  patch.object(publisher, "notion") as api):
                with self.assertRaisesRegex(RuntimeError, "DUPLICATE_PUBLICATION"):
                    publisher.stage()
                api.assert_not_called()
                self.assertEqual(ledger.read_text(), before)

    def test_prior_publication_wins_over_changed_article_relations(self):
        article = row("already-live")
        article["properties"]["배포 사이트"]["relation"].append({"id": "another-site"})
        history = [{"site_id": publisher.SITE_ID, "page_id": "already-live", "state": "published"}]
        with self.assertRaisesRegex(RuntimeError, "DUPLICATE_PUBLICATION"):
            publisher.prepare_article(article, "2026-10-26", history)

    def assert_response_stops(self, first, error=RuntimeError, render_error=None):
        with tempfile.TemporaryDirectory() as td:
            home = Path(td)
            articles = home / "src/content/articles"
            articles.mkdir(parents=True)
            ledger = home / "ledger.jsonl"
            before = json.dumps({"site_id": "other-site", "state": "published"}) + "\n"
            ledger.write_text(before)
            with (patch.object(publisher, "ROOT", home), patch.object(publisher, "LEDGER", ledger),
                  patch.object(publisher, "verify_site_registry", return_value={}),
                  patch.object(publisher, "fetch_ready", return_value=[first, row("second")]),
                  patch.object(publisher, "markdown", return_value="Word " * 600, side_effect=render_error) as render,
                  patch.object(publisher, "notion") as api,
                  patch.dict("os.environ", {"PUBLISH_SLOT": "morning", "GUIDEHOLLOW_VALIDATE_BUILD": "0"})):
                with self.assertRaises(error):
                    publisher.stage()
                api.assert_not_called()
                self.assertEqual(ledger.read_text(), before)
                self.assertEqual(list(articles.iterdir()), [])
                self.assertNotIn(unittest.mock.call("second"), render.call_args_list)

    def test_missing_official_sources_stops_without_failure_patch_or_next_article(self):
        article = row("first")
        del article["properties"]["공식출처"]
        self.assert_response_stops(article)

    def test_missing_or_wrong_properties_stop_without_writes(self):
        for article in ({"id": "first"}, {"id": "first", "properties": None},
                        {"id": "first", "properties": []}, {"id": "first", "properties": "wrong"}):
            with self.subTest(article=article): self.assert_response_stops(article)

    def test_malformed_required_property_shapes_stop_without_writes(self):
        cases = [
            ("공식출처", {"type": "rich_text"}),
            ("공식출처", {"type": "rich_text", "rich_text": "https://example.com"}),
            ("공식출처", {"type": "rich_text", "rich_text": [{"plain_text": 42}]}),
            ("제목", {"type": "rich_text", "rich_text": rich("Wrong property type")}),
            ("카테고리", []), ("카테고리", {}),
            ("카테고리", {"select": "guides"}),
            ("카테고리", {"select": {"name": 42}}),
            ("카테고리", {"select": {}}),
            ("배포 사이트", {}), ("배포 사이트", {"relation": None}),
            ("배포 사이트", {"relation": "wrong"}),
            ("배포 사이트", {"relation": [None]}),
            ("배포 사이트", {"relation": [{}]}),
            ("배포 사이트", {"relation": [{"id": 42}]}),
            ("배포 사이트", {"relation": [{"id": publisher.SITE_PAGE}], "has_more": True}),
            ("검수승인", {"checkbox": "true"}),
            ("발행예정일", {"date": {"start": None}}),
        ]
        for key, value in cases:
            with self.subTest(property=key, value=value):
                article = row("first")
                kinds = {"카테고리": "select", "배포 사이트": "relation", "검수승인": "checkbox", "발행예정일": "date"}
                article["properties"][key] = {"type": kinds.get(key, "rich_text"), **value} if isinstance(value, dict) else value
                self.assert_response_stops(article)

    def test_only_explicit_editorial_failures_quarantine_and_advance(self):
        cases = [("제목", "title", []), ("설명", "rich_text", rich("Too short")),
                 ("슬러그", "rich_text", rich("INVALID SLUG")),
                 ("카테고리", "select", {"name": "unknown"}), ("카테고리", "select", None),
                 ("태그", "rich_text", rich("BAD TAG")), ("공식출처", "rich_text", []),
                 ("공식출처", "rich_text", rich("http://example.com")),
                 ("공식출처", "rich_text", rich("https://[invalid")), ("unsupported-block", None, None)]
        for key, kind, value in cases:
            with self.subTest(property=key, value=value), tempfile.TemporaryDirectory() as td:
                home = Path(td)
                (home / "src/content/articles").mkdir(parents=True)
                bad, good = row("first"), row("second")
                if kind: bad["properties"][key] = {"type": kind, kind: value}
                def blocks(page_id):
                    if page_id == "first" and key == "unsupported-block":
                        return [{"type": "child_page", "has_children": False, "child_page": {}}]
                    return [block("Word " * 600)]
                with (patch.object(publisher, "ROOT", home), patch.object(publisher, "LEDGER", home/"ledger.jsonl"),
                      patch.object(publisher, "verify_site_registry", return_value={}),
                      patch.object(publisher, "fetch_ready", return_value=[bad, good]),
                      patch.object(publisher, "children", side_effect=blocks),
                      patch.object(publisher, "notion", return_value={}) as api,
                      patch.dict("os.environ", {"PUBLISH_SLOT": "morning", "GUIDEHOLLOW_VALIDATE_BUILD": "0"})):
                    result = publisher.stage()
                    self.assertEqual(result["page_id"], "second")
                    self.assertEqual(result["failed_before_selection"], 1)
                    rejected = api.call_args_list[0].args
                    self.assertEqual(rejected[:2], ("PATCH", "/pages/first"))
                    self.assertEqual(rejected[2]["properties"]["상태"]["select"]["name"], "실패")
                    self.assertTrue(rejected[2]["properties"]["오류"]["rich_text"][0]["text"]["content"])
                    self.assertEqual(json.loads((home/"ledger.jsonl").read_text())["page_id"], "second")

    def test_unexpected_python_errors_are_not_editorial_failures(self):
        for error in (KeyError("rich_text"), TypeError("unexpected shape"), ValueError("unclassified parser error")):
            with self.subTest(error=type(error).__name__):
                self.assert_response_stops(row("first"), type(error), error)

    def test_malformed_body_data_stops_without_failure_patch_or_next_article(self):
        # Exercise the converter rather than injecting an already classified exception.
        convert = publisher.markdown
        for item in ({"type": "paragraph", "paragraph": {}},
                     {"type": "paragraph", "paragraph": {"rich_text": [{"plain_text": 42}]}},
                     {"type": "to_do", "to_do": {"checked": "false", "rich_text": rich("Check")}},
                     {"type": "paragraph", "has_children": "false", "paragraph": {"rich_text": rich("Text")}},
                     {"type": "image", "image": {}},
                     {"type": "image", "image": {"type": "external", "external": {}}}):
            with self.subTest(item=item), patch.object(publisher, "children", return_value=[item]):
                self.assert_response_stops(row("first"), RuntimeError, convert)

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
