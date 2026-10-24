#!/usr/bin/env python3
"""One approved Notion article -> GuideHollow Astro Markdown. No AI generation at release."""
import argparse
from datetime import datetime
from html import escape as html_escape
import json
import os
from pathlib import Path
import re
import sys
from zoneinfo import ZoneInfo
from datetime import timezone
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://guidehollow.com"
REPO = "emfls/guidehollow"
SITE_ID = "gh-main"
QUEUE_ID = os.getenv("NOTION_QUEUE_ID", "b788e982-fc20-4df0-9f1b-8ff2a19f271d")
SITE_PAGE = os.getenv("NOTION_SITE_PAGE_ID", "402db4c0-a991-81ed-a03d-d8b1c2247d76")
LEDGER = ROOT / "data" / "guidehollow-publication-ledger.jsonl"
API = "https://api.notion.com/v1"


def notion(method, route, data=None):
    token = os.getenv("NOTION_API_TOKEN", "")
    if not token:
        raise RuntimeError("MISSING_NOTION_API_TOKEN: set this GitHub Actions repository secret")
    req = Request(
        API + route,
        data=None if data is None else json.dumps(data).encode("utf-8"),
        headers={"Authorization": "Bearer " + token,
                 "Notion-Version": "2025-09-03",
                 "Content-Type": "application/json"},
        method=method)
    with urlopen(req, timeout=25) as res:
        return json.load(res)


def plain(items):
    return "".join(x.get("plain_text", "") for x in items)


def prop(props, name):
    p = props[name]
    return plain(p.get("title", []) if p["type"] == "title" else p.get("rich_text", []))


def children(block_id):
    items = []
    cursor = None
    while True:
        route = "/blocks/" + block_id + "/children?page_size=100"
        if cursor:
            route += "&start_cursor=" + quote(cursor)
        batch = notion("GET", route)
        items.extend(batch["results"])
        if not batch.get("has_more"):
            return items
        cursor = batch["next_cursor"]


def safe_inline(items):
    result = []
    for item in items:
        t = item.get("plain_text", "")
        if "\x00" in t:
            raise ValueError("Null byte in article")
        # No raw HTML or user-supplied Markdown injections.
        t = t.replace("\\", "\\\\").replace("<", "&lt;").replace(">", "&gt;")
        t = re.sub(r"([*_\[\]])", r"\\\1", t)
        annotations = item.get("annotations", {})
        if annotations.get("code"):
            t = "`" + t.replace("`", "'") + "`"
        if annotations.get("bold"):
            t = "**" + t + "**"
        if annotations.get("italic"):
            t = "*" + t + "*"
        url = item.get("href")
        if url:
            parsed = urlsplit(url)
            if parsed.scheme != "https":
                raise ValueError("Non-HTTPS inline link")
            # Notion normalizes originally relative GuideHollow links against app.notion.com.
            # Restore only recognized site paths. Genuine Notion page URLs are unchanged.
            if parsed.hostname == "app.notion.com" and re.match(
                r"^/(?:guides|ai-tools|prompts|troubleshooting|tools)/", parsed.path
            ):
                url = parsed.path + (("?" + parsed.query) if parsed.query else "") + (
                    ("#" + parsed.fragment) if parsed.fragment else ""
                )
            t = "[" + t + "](" + url.replace(")", "%29") + ")"
        result.append(t)
    # Adjacent bold text/code spans must remain one valid Markdown emphasis run.
    return "".join(result).replace("****", "")


def markdown(block_id):
    out = []
    previous_list = None
    for block in children(block_id):
        kind = block["type"]
        list_kind = kind if kind in ("bulleted_list_item", "numbered_list_item") else None
        if previous_list and previous_list != list_kind:
            out.append("")  # prevent following prose from becoming the final list item
        previous_list = list_kind
        data = block[kind]
        if kind == "table":
            if not block.get("has_children"):
                raise ValueError("Table without rows")
            rows = children(block["id"])
            cells = []
            for row in rows:
                if row["type"] != "table_row":
                    raise ValueError("Unexpected table child: " + row["type"])
                cells.append([safe_inline(c).replace("|", "&#124;")
                              for c in row["table_row"]["cells"]])
            if not cells or any(len(r) != len(cells[0]) for r in cells):
                raise ValueError("Invalid table")
            out.append("| " + " | ".join(cells[0]) + " |")
            out.append("| " + " | ".join("---" for _ in cells[0]) + " |")
            for row in cells[1:]:
                out.append("| " + " | ".join(row) + " |")
            out.append("")
            continue
        if kind == "code":
            code = plain(data["rich_text"])
            language = data.get("language", "text").split()[0].lower()
            if not re.fullmatch(r"[a-z0-9+#-]+", language):
                language = "text"
            out.extend(["```" + language, code, "```", ""])
            continue
        if kind == "divider":
            out.extend(["---", ""])
            continue
        if block.get("has_children"):
            raise ValueError("Unsupported nested block: " + kind)
        if kind not in ("paragraph", "heading_1", "heading_2", "heading_3",
                        "bulleted_list_item", "numbered_list_item", "quote"):
            raise ValueError("Unsupported block: " + kind)
        text = safe_inline(data.get("rich_text", []))
        if kind == "heading_1" or kind == "heading_2":
            out.extend(["## " + text, ""])
        elif kind == "heading_3":
            out.extend(["### " + text, ""])
        elif kind == "bulleted_list_item":
            out.append("- " + text)
        elif kind == "numbered_list_item":
            out.append("1. " + text)
        elif kind == "quote":
            out.extend(["> " + text, ""])
        else:
            out.extend([text, ""])
    return "\n".join(out).strip() + "\n"


def fetch_ready():
    items, cursor = [], None
    while True:
        payload = {"filter": {"property": "상태", "select": {"equals": "발행대기"}},
                   "sorts": [{"property": "발행순서", "direction": "ascending"}],
                   "page_size": 100}
        if cursor:
            payload["start_cursor"] = cursor
        batch = notion("POST", "/data_sources/" + QUEUE_ID + "/query", payload)
        items.extend(batch["results"])
        if not batch.get("has_more"):
            break
        cursor = batch["next_cursor"]
    return items


def verify_site_registry():
    record = notion("GET", "/pages/" + SITE_PAGE)
    p = record["properties"]
    expected = {"Site ID": SITE_ID, "Repository": REPO, "Base URL": SITE,
                "Status": "active", "Content Format": "astro-markdown"}
    observed = {
        "Site ID": prop(p, "Site ID"),
        "Repository": prop(p, "Repository"),
        "Base URL": (p["Base URL"].get("url") or "").rstrip("/"),
        "Status": (p["Status"].get("select") or {}).get("name"),
        "Content Format": prop(p, "Content Format"),
    }
    if observed != expected or p["Daily Limit"].get("number") != 1:
        raise ValueError("SITE_REGISTRY_MISMATCH: " + repr(observed))
    return record


def eligible(item):
    p = item["properties"]
    related = p["배포 사이트"].get("relation", [])
    if len(related) != 1:
        raise ValueError("An approved article must point to exactly one site")
    if related[0]["id"] != SITE_PAGE:
        return False
    return p["검수승인"].get("checkbox", False) is True


def stage():
    verify_site_registry()
    today = datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()
    history = []
    if LEDGER.exists():
        history = [json.loads(x) for x in LEDGER.read_text().splitlines() if x.strip()]
    if any(row.get("kst_date") == today and row.get("site_id") == SITE_ID for row in history):
        return {"status": "ALREADY_STAGED_TODAY"}
    ready = [item for item in fetch_ready() if eligible(item)]
    if not ready:
        return {"status": "QUEUE_EMPTY"}
    row = ready[0]
    p = row["properties"]
    title, slug = prop(p, "제목").strip(), prop(p, "슬러그").strip()
    category = (p["카테고리"].get("select") or {}).get("name", "")
    description = prop(p, "설명").strip()
    tags = [s.strip() for s in prop(p, "태그").split(",") if s.strip()]
    sources = [x.strip() for x in prop(p, "공식출처").splitlines() if x.strip()]
    if not title or not (50 <= len(description) <= 200):
        raise ValueError("Invalid article title or description")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise ValueError("Unsafe article slug")
    if category not in ("guides", "ai-tools", "prompts", "troubleshooting"):
        raise ValueError("Unsupported category")
    if not tags or not all(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", s) for s in tags):
        raise ValueError("Invalid tag")
    if not sources or not all(urlsplit(url).scheme == "https" for url in sources):
        raise ValueError("Official HTTPS references required")
    due = p["발행예정일"].get("date")
    if due and due["start"][:10] > today:
        return {"status": "NOT_DUE"}
    destination = ROOT / "src" / "content" / "articles" / (slug + ".md")
    if destination.exists():
        raise ValueError("Duplicate slug/file: " + slug)
    body = markdown(row["id"])
    if len(body.split()) < 550:
        raise ValueError("Insufficient article substance")
    frontmatter = {
        "title": title, "description": description,
        "slug": slug, "category": category, "tags": tags,
        "publishedDate": today, "updatedDate": today,
        "sources": [{"title": urlsplit(url).netloc + " — reference", "url": url} for url in sources],
        "draft": False, "author": "GuideHollow Editorial", "featured": False,
    }
    head = "\n".join(k + ": " + json.dumps(v, ensure_ascii=False)
                     for k,v in frontmatter.items())
    destination.write_text("---\n" + head + "\n---\n\n" + body, encoding="utf-8")
    LEDGER.parent.mkdir(exist_ok=True, parents=True)
    public_url = SITE + "/" + category + "/" + slug + "/"
    with LEDGER.open("a", encoding="utf-8") as out:
        out.write(json.dumps({"site_id": SITE_ID, "kst_date": today,
                              "page_id": row["id"], "title": title, "url": public_url,
                              "state": "staged"}, ensure_ascii=False) + "\n")
    notion("PATCH", "/pages/" + row["id"],
           {"properties": {"상태": {"select": {"name": "발행중"}}}})
    return {"status": "STAGED", "file": str(destination.relative_to(ROOT)),
            "url": public_url, "title": title, "page_id": row["id"]}


def finalize(page_id, url):
    verify_site_registry()
    if not url.startswith(SITE + "/") or not page_id:
        raise ValueError("Invalid finalization target")
    if not LEDGER.is_file():
        raise ValueError("Missing publication ledger")
    records = [json.loads(x) for x in LEDGER.read_text().splitlines() if x.strip()]
    matched = [x for x in records if x.get("page_id") == page_id and x.get("url") == url]
    if len(matched) != 1:
        raise ValueError("Ledger mismatch or duplicate")
    req = Request(url + "?verify-notion-publication=1",headers={"Cache-Control": "no-cache"})
    with urlopen(req, timeout=20) as response:
        page = response.read().decode("utf-8")
        if response.status != 200 or html_escape(matched[0]["title"]) not in page:
            raise ValueError("Public page does not contain the expected title")
    notion("PATCH", "/pages/" + page_id,
           {"properties": {"상태": {"select": {"name": "발행완료"}},
                           "게시 URL": {"url": url},
                           "발행일시": {"date": {"start": datetime.now(timezone.utc).isoformat()}}}})
    return {"status": "PUBLISHED", "url": url}


def selftest():
    assert safe_inline([{"plain_text": "<hello>"}]) == "&lt;hello&gt;"
    assert safe_inline([{"plain_text": "bold", "annotations":{"bold": True}}]) == "**bold**"
    assert SITE == "https://guidehollow.com"
    print(json.dumps({"status": "SELFTEST_OK"}))
    return {"status": "SELFTEST_OK"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("stage","finalize","selftest"))
    parser.add_argument("--page-id")
    parser.add_argument("--url")
    args = parser.parse_args()
    try:
        result = stage() if args.command == "stage" else (
            finalize(args.page_id, args.url) if args.command == "finalize" else selftest())
        if args.command != "selftest":
            print(json.dumps(result,ensure_ascii=False))
    except Exception as ex:
        print("NOTION_PUBLICATION_ERROR: " + str(ex), file=sys.stderr)
        sys.exit(1)
