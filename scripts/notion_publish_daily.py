#!/usr/bin/env python3
"""One approved Notion article -> GuideHollow Astro Markdown. No AI generation at release."""
import argparse
from datetime import datetime
from html import escape as html_escape
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from zoneinfo import ZoneInfo
from datetime import timezone
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://guidehollow.com"
REPO = "emfls/guidehollow"
SITE_ID = "gh-main"
DAILY_LIMIT = 3
SLOTS = ("morning", "afternoon", "evening")
MAX_FAILED_CANDIDATES_PER_RUN = 20
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
        try:
            payload = json.load(res)
        except (ValueError, UnicodeError) as exc:
            raise RuntimeError("NOTION_RESPONSE_INVALID: expected JSON object") from exc
        if not isinstance(payload, dict):
            raise RuntimeError("NOTION_RESPONSE_INVALID: expected JSON object")
        return payload


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
        if (not isinstance(batch.get("results"), list) or
                (batch.get("has_more") and not batch.get("next_cursor"))):
            raise RuntimeError("NOTION_RESPONSE_INVALID: incomplete paginated response")
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



def approved_image_block(block):
    """Render only a pre-reviewed, repository-hosted SVG with explicit editorial context.

    The Notion image must be an external image linked to the same site's /visuals/
    path. Notion's expiring uploaded file URLs, remote stock images and raw HTML
    are never embedded in an automatic publication.
    """
    if block.get('has_children'):
        raise ValueError('VISUAL_REVIEW_REQUIRED: nested image blocks are unsupported')
    item = block['image']
    if item.get('type') != 'external':
        raise ValueError('VISUAL_REVIEW_REQUIRED: use an external image linked to an approved /visuals/ SVG; Notion file links expire')
    url = (item.get('external') or {}).get('url', '')
    parsed, site = urlsplit(url), urlsplit(SITE)
    if (parsed.scheme, parsed.netloc) != (site.scheme, site.netloc) or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('VISUAL_REVIEW_REQUIRED: image URL must be an exact asset URL on this site')
    if not re.fullmatch(r'/visuals/[a-z0-9]+(?:-[a-z0-9]+)*\.svg', parsed.path):
        raise ValueError('VISUAL_REVIEW_REQUIRED: only reviewed /visuals/name.svg images are supported')
    asset = ROOT / 'public' / parsed.path.lstrip('/')
    if not asset.is_file() or asset.stat().st_size > 60000:
        raise ValueError('VISUAL_REVIEW_REQUIRED: SVG missing from GitHub public/visuals or exceeds 60 KB')
    data = asset.read_bytes()
    if b'<!DOCTYPE' in data.upper() or b'<!ENTITY' in data.upper():
        raise ValueError('VISUAL_REVIEW_REQUIRED: SVG entities or doctypes are not permitted')
    if re.search(rb'url\s*\(|javascript\s*:', data, re.I):
        raise ValueError('VISUAL_REVIEW_REQUIRED: SVG cannot contain embedded or remote resource links')
    try:
        image = ET.fromstring(data)
    except ET.ParseError as exc:
        raise ValueError('VISUAL_REVIEW_REQUIRED: malformed SVG') from exc
    if image.tag != '{http://www.w3.org/2000/svg}svg':
        raise ValueError('VISUAL_REVIEW_REQUIRED: SVG root must have an SVG namespace')
    bounds = re.fullmatch(r'0 0 (\d+) (\d+)', image.get('viewBox', '').strip())
    if not bounds:
        raise ValueError('VISUAL_REVIEW_REQUIRED: SVG must declare viewBox="0 0 width height"')
    width, height = map(int, bounds.groups())
    if not (250 <= width <= 3000 and 150 <= height <= 3000):
        raise ValueError('VISUAL_REVIEW_REQUIRED: SVG dimensions outside the supported range')
    denied_tags = {'script', 'foreignObject', 'image', 'use', 'a', 'style', 'animate', 'animateMotion',
                   'animateTransform', 'set', 'feImage', 'iframe'}
    for node in image.iter():
        if node.tag.split('}')[-1] in denied_tags:
            raise ValueError('VISUAL_REVIEW_REQUIRED: unsafe or external SVG element')
        for name in node.attrib:
            attribute = name.split('}')[-1].lower()
            if attribute.startswith('on') or attribute == 'href' or attribute == 'style':
                raise ValueError('VISUAL_REVIEW_REQUIRED: SVG event handlers, hrefs and styles are not permitted')
    lines = plain(item.get('caption', [])).replace('\r\n', '\n').strip().split('\n')
    if len(lines) != 3:
        raise ValueError('VISUAL_REVIEW_REQUIRED: image caption needs Alt:, Caption:, Credit: on separate lines')
    fields = {}
    for prefix, line in zip(('Alt: ', 'Caption: ', 'Credit: '), lines):
        if not line.startswith(prefix):
            raise ValueError('VISUAL_REVIEW_REQUIRED: caption must contain Alt:, Caption:, Credit: in that order')
        fields[prefix] = line[len(prefix):].strip()
    alt, caption, credit = (fields[key] for key in ('Alt: ', 'Caption: ', 'Credit: '))
    if not (30 <= len(alt) <= 240 and 25 <= len(caption) <= 360 and 10 <= len(credit) <= 180):
        raise ValueError('VISUAL_REVIEW_REQUIRED: meaningful alt text, caption and credit are required')
    if any('\x00' in value for value in (alt, caption, credit)):
        raise ValueError('VISUAL_REVIEW_REQUIRED: null byte in visual metadata')
    digest = hashlib.sha256(data).hexdigest()
    return ('<figure class="article-visual" data-asset-sha256="' + digest + '">\n'
            '<img src="' + parsed.path + '" alt="' + html_escape(alt, quote=True) + '"'
            ' width="' + str(width) + '" height="' + str(height) + '"'
            ' loading="lazy" decoding="async">\n'
            '<figcaption>' + html_escape(caption) + ' — ' + html_escape(credit) + '</figcaption>\n'
            '</figure>')


def markdown(block_id):
    out = []
    previous_list = None
    for block in children(block_id):
        kind = block["type"]
        list_kind = kind if kind in ("bulleted_list_item", "numbered_list_item", "to_do") else None
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
        if kind == "image":
            out.extend([approved_image_block(block), ""])
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
                        "bulleted_list_item", "numbered_list_item", "to_do", "quote"):
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
        elif kind == "to_do":
            # Notion checkboxes are editorial content, never workflow approval.
            if not isinstance(data.get("checked"), bool):
                raise ValueError("Malformed Notion to_do checked flag")
            out.append("- [" + ("x" if data["checked"] else " ") + "] " + text)
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
        if (not isinstance(batch.get("results"), list) or
                (batch.get("has_more") and not batch.get("next_cursor"))):
            raise RuntimeError("NOTION_RESPONSE_INVALID: incomplete paginated response")
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
    if observed != expected or p["Daily Limit"].get("number") != DAILY_LIMIT:
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


def publication_preflight():
    """Read-only ledger health check. A successful QA run is not proof of publication."""
    history = []
    if LEDGER.exists():
        history = [json.loads(line) for line in LEDGER.read_text(encoding="utf-8").splitlines() if line.strip()]
    own = [row for row in history if row.get("site_id") == SITE_ID]
    unresolved = [row for row in own if row.get("state") == "staged"]
    unexpected = [row for row in own if row.get("state") not in ("staged", "published")]
    return {
        "status": "BLOCKED" if unresolved or unexpected else "READY_FOR_QUEUE_CHECK",
        "site_id": SITE_ID, "checked_records": len(own),
        "unresolved": [{"kst_date": row.get("kst_date"), "page_id": row.get("page_id"),
                        "url": row.get("url"), "state": row.get("state")} for row in unresolved],
        "unexpected_state_count": len(unexpected),
    }


def resolve_slot(history, today):
    """A manual dispatch consumes the first available slot and counts toward 3/day."""
    requested = os.getenv("PUBLISH_SLOT", "manual")
    if requested not in SLOTS and requested != "manual":
        raise ValueError("Unknown publication slot")
    own_today = [r for r in history if r.get("site_id") == SITE_ID and r.get("kst_date") == today]
    if len(own_today) >= DAILY_LIMIT:
        return None, "DAILY_LIMIT_REACHED"
    occupied = {r.get("slot") for r in own_today}
    if requested == "manual":
        remaining = [slot for slot in SLOTS if slot not in occupied]
        return (remaining[0], None) if remaining else (None, "SLOTS_EXHAUSTED")
    if requested in occupied:
        return None, "SLOT_ALREADY_USED"
    return requested, None


def flag_article_failure(item, detail):
    """Quarantine only a reviewed, article-specific failure; never reselect until manually reset."""
    reason = ("원고 검증 실패: " + str(detail)).replace("\x00", "").strip()[:1700]
    notion("PATCH", "/pages/" + item["id"], {
        "properties": {
            "상태": {"select": {"name": "실패"}},
            "오류": {"rich_text": [{"type": "text", "text": {"content": reason}}]},
        }
    })


def prepare_article(row, today, history):
    p = row["properties"]
    if any(r.get("site_id") == SITE_ID and r.get("page_id") == row["id"] for r in history):
        raise RuntimeError("DUPLICATE_PUBLICATION: this Notion page is already in the ledger; review without changing its publication record")
    if not eligible(row):
        raise ValueError("Article is not approved for exactly one main site")
    title, slug = prop(p, "제목").strip(), prop(p, "슬러그").strip()
    category = (p["카테고리"].get("select") or {}).get("name", "")
    description = prop(p, "설명").strip()
    tags = [value.strip() for value in prop(p, "태그").split(",") if value.strip()]
    sources = [value.strip() for value in prop(p, "공식출처").splitlines() if value.strip()]
    if not title or len(title) < 10 or not (50 <= len(description) <= 200):
        raise ValueError("Invalid article title or description")
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        raise ValueError("Unsafe article slug")
    if category not in ("guides", "ai-tools", "prompts", "troubleshooting"):
        raise ValueError("Unsupported category")
    if not tags or not all(re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", x) for x in tags):
        raise ValueError("Invalid tags")
    if not sources or not all(urlsplit(url).scheme == "https" and urlsplit(url).netloc for url in sources):
        raise ValueError("Official HTTPS references required")
    destination = ROOT / "src" / "content" / "articles" / (slug + ".md")
    if destination.exists():
        raise ValueError("Duplicate slug/file: " + slug)
    body = markdown(row["id"])
    if len(body.split()) < 550:
        raise ValueError("Insufficient article substance (minimum 550 words)")
    fields = {
        "title": title, "description": description,
        "slug": slug, "category": category, "tags": tags,
        "publishedDate": today, "updatedDate": today,
        "sources": [{"title": urlsplit(url).netloc + " — reference", "url": url} for url in sources],
        "draft": False, "author": "GuideHollow Editorial", "featured": False,
    }
    heading = "\n".join(key + ": " + json.dumps(value, ensure_ascii=False)
                        for key, value in fields.items())
    article = "---\n" + heading + "\n---\n\n" + body
    url = SITE + "/" + category + "/" + slug + "/"
    return {"path": destination, "text": article, "url": url, "title": title}


def verify_candidate_build(destination):
    """Only article-specific check/build failures advance to the next candidate.

    A previously green baseline cannot prove that a later npm failure is editorial.
    Only explicit validation diagnostics naming this candidate can quarantine it.
    """
    if os.getenv("GUIDEHOLLOW_VALIDATE_BUILD") != "1":
        return
    for command in (["npm", "run", "check"], ["npm", "run", "build"]):
        result = subprocess.run(command, cwd=ROOT, capture_output=True,
                                text=True, timeout=240, check=False)
        if result.returncode:
            output = result.stdout + "\n" + result.stderr
            # Unknown failures (including resource exhaustion) must stop the release.
            diagnostic = re.search(r"(?:AssertionError[^\n]*|\[InvalidContentEntryDataError\][\s\S]*)", output)
            if result.returncode == 1 and diagnostic and re.search(
                    r"(?<![a-z0-9-])" + re.escape(destination.stem) + r"(?:\.md|/)", diagnostic.group()):
                raise ValueError("Candidate Astro validation failed: " + diagnostic.group()[-800:])
            raise RuntimeError("BUILD_INFRASTRUCTURE_OR_UNKNOWN: inspect Actions build logs")


def stage():
    verify_site_registry()
    today = datetime.now(ZoneInfo("Asia/Seoul")).date().isoformat()
    history = []
    if LEDGER.exists():
        history = [json.loads(x) for x in LEDGER.read_text(encoding="utf-8").splitlines() if x.strip()]
    check = publication_preflight()
    if check["status"] != "READY_FOR_QUEUE_CHECK":
        raise ValueError("UNRECONCILED_LEDGER: prior staged records or unknown ledger states "
                         "require deployed SHA/Notion review before another article")
    slot, blocker = resolve_slot(history, today)
    if blocker:
        return {"status": blocker, "daily_limit": DAILY_LIMIT}
    ready = fetch_ready()
    if not ready:
        return {"status": "QUEUE_EMPTY", "slot": slot}
    failures, deferred = 0, 0
    for row in ready:
        # Shared network queue: never alter another site's article or an unapproved draft.
        related = row["properties"]["배포 사이트"].get("relation", [])
        if not any(entry.get("id") == SITE_PAGE for entry in related):
            continue
        if not row["properties"]["검수승인"].get("checkbox", False):
            continue
        due = row["properties"]["발행예정일"].get("date")
        if due and due["start"][:10] > today:
            deferred += 1
            continue
        destination, written = None, False
        try:
            candidate = prepare_article(row, today, history)
            destination = candidate["path"]
            destination.write_text(candidate["text"], encoding="utf-8")
            written = True
            verify_candidate_build(destination)
        except (ValueError, KeyError, TypeError) as exc:
            if written and destination is not None:
                destination.unlink(missing_ok=True)
            flag_article_failure(row, exc)
            failures += 1
            if failures >= MAX_FAILED_CANDIDATES_PER_RUN:
                return {"status": "MAX_FAILURES_REACHED", "failed": failures, "slot": slot}
            continue
        LEDGER.parent.mkdir(exist_ok=True, parents=True)
        # Files + ledger remain local until workflow CI and non-forced main push succeed.
        with LEDGER.open("a", encoding="utf-8") as out:
            out.write(json.dumps({
                "site_id": SITE_ID, "kst_date": today, "slot": slot,
                "page_id": row["id"], "title": candidate["title"],
                "url": candidate["url"], "state": "staged",
            }, ensure_ascii=False) + "\n")
        notion("PATCH", "/pages/" + row["id"], {
            "properties": {
                "상태": {"select": {"name": "발행중"}},
                "오류": {"rich_text": []},
            }
        })
        return {
            "status": "STAGED", "file": str(destination.relative_to(ROOT)),
            "url": candidate["url"], "title": candidate["title"], "page_id": row["id"],
            "slot": slot, "failed_before_selection": failures,
        }
    return {"status": "QUEUE_EMPTY" if failures == 0 else "ALL_CANDIDATES_FAILED",
            "failed": failures, "deferred": deferred, "slot": slot}


def finalize(page_id, url):
    verify_site_registry()
    sha = os.getenv("PUBLISHED_COMMIT_SHA", "").strip()
    if not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise ValueError("DEPLOYMENT_SHA_REQUIRED: a verified Pages deployment SHA is mandatory")
    if not url.startswith(SITE + "/") or not page_id:
        raise ValueError("Invalid finalization target")
    if not LEDGER.is_file():
        raise ValueError("Missing publication ledger")
    rows = [json.loads(x) for x in LEDGER.read_text(encoding="utf-8").splitlines() if x.strip()]
    match = [r for r in rows if r.get("site_id") == SITE_ID and r.get("page_id") == page_id and r.get("url") == url]
    if len(match) != 1:
        raise ValueError("Ledger mismatch or duplicate")
    row = match[0]
    if row.get("state") == "published" and row.get("commit") == sha:
        return {"status": "ALREADY_PUBLISHED", "url": url}
    if row.get("state") != "staged":
        raise ValueError("Cannot finalize unexpected ledger state")
    slug = urlsplit(url).path.rstrip("/").rsplit("/", 1)[-1]
    source = ROOT / "src" / "content" / "articles" / (slug + ".md")
    if (not source.is_file() or not row.get("title") or
            'slug: "' + slug + '"' not in source.read_text(encoding="utf-8")):
        raise ValueError("Article source does not match ledger")
    detail = notion("GET", "/pages/" + page_id)["properties"]
    relation = detail["배포 사이트"].get("relation", [])
    if (len(relation) != 1 or relation[0]["id"] != SITE_PAGE or
            not detail["검수승인"].get("checkbox") or
            (detail["상태"].get("select") or {}).get("name") not in ("발행중", "발행완료") or
            (detail["게시 URL"].get("url") or url) != url):
        raise ValueError("Notion item approval/site/status changed")
    req = Request(url + "?verify-notion-publication=1", headers={"Cache-Control": "no-cache"})
    with urlopen(req, timeout=20) as response:
        body = response.read().decode("utf-8")
        if (response.status != 200 or html_escape(row["title"]) not in body or
                ('rel="canonical" href="' + url + '"') not in body or
                '<article class="prose"' not in body or "Official sources" not in body):
            raise ValueError("Public page title, canonical or body mismatch")
    now = datetime.now(timezone.utc).isoformat()
    notion("PATCH", "/pages/" + page_id,
           {"properties": {"상태": {"select": {"name": "발행완료"}},
                           "게시 URL": {"url": url},
                           "GitHub 커밋": {"url": "https://github.com/" + REPO + "/commit/" + sha},
                           "발행일시": {"date": {"start": now}}}})
    row.update({"state": "published", "commit": sha, "published_at": now})
    temp = LEDGER.with_suffix(".jsonl.tmp")
    temp.write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in rows), encoding="utf-8")
    os.replace(temp, LEDGER)
    return {"status": "PUBLISHED", "url": url, "commit": sha}

def selftest():
    assert safe_inline([{"plain_text": "<hello>"}]) == "&lt;hello&gt;"
    assert safe_inline([{"plain_text": "bold", "annotations":{"bold": True}}]) == "**bold**"
    assert SITE == "https://guidehollow.com"
    print(json.dumps({"status": "SELFTEST_OK"}))
    return {"status": "SELFTEST_OK"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=("stage","finalize","selftest","preflight"))
    parser.add_argument("--page-id")
    parser.add_argument("--url")
    args = parser.parse_args()
    try:
        result = (stage() if args.command == "stage" else
                  finalize(args.page_id, args.url) if args.command == "finalize" else
                  publication_preflight() if args.command == "preflight" else selftest())
        if args.command != "selftest":
            print(json.dumps(result,ensure_ascii=False))
    except Exception as ex:
        print("NOTION_PUBLICATION_ERROR: " + str(ex), file=sys.stderr)
        sys.exit(1)
