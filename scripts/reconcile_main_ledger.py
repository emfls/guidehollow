#!/usr/bin/env python3
"""One-time, read-only verification of legacy main Notion items before ledger repair.

Only the existing main-site ledger is modified, and only after all items pass
Notion approval, content, live URL and canonical checks. Never republish content.
The invoking workflow separately verifies the exact current Pages deployed SHA.
"""
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen
from html import escape

import notion_publish_daily as pub

def reconcile():
    sha = os.environ.get("VERIFIED_PAGES_SHA", "").strip()
    import re
    if not re.fullmatch(r"[0-9a-f]{40}", sha):
        raise ValueError("RECONCILE_REQUIRES_DEPLOYED_SHA")
    pub.verify_site_registry()
    ledger = pub.LEDGER
    rows = [json.loads(x) for x in ledger.read_text(encoding="utf-8").splitlines() if x.strip()]
    affected = [r for r in rows if r.get("site_id") == pub.SITE_ID and r.get("state") == "staged"]
    if not affected:
        return {"status": "ALREADY_RECONCILED", "count": 0}
    if len(affected) > 10:
        raise ValueError("Unexpectedly large legacy ledger; manual review required")
    for row in affected:
        page_id, url, title = row.get("page_id"), row.get("url", ""), row.get("title")
        parts = urlsplit(url)
        if (not page_id or not title or parts.scheme != "https" or
                parts.netloc != "guidehollow.com" or parts.query or parts.fragment or
                not parts.path.endswith("/")):
            raise ValueError("Invalid legacy ledger entry")
        slug = parts.path.rstrip("/").split("/")[-1]
        source = pub.ROOT / "src" / "content" / "articles" / (slug + ".md")
        if not source.is_file() or ('slug: "' + slug + '"') not in source.read_text(encoding="utf-8"):
            raise ValueError("Legacy article file missing or slug mismatch: " + slug)
        props = pub.notion("GET", "/pages/" + page_id)["properties"]
        rel = props["배포 사이트"].get("relation", [])
        if (len(rel) != 1 or rel[0]["id"] != pub.SITE_PAGE or
                not props["검수승인"].get("checkbox") or
                (props["상태"].get("select") or {}).get("name") != "발행완료" or
                props["게시 URL"].get("url") != url):
            raise ValueError("Notion completion/site/approval mismatch: " + page_id)
        with urlopen(Request(url + "?main-ledger-reconcile=1",
                             headers={"Cache-Control": "no-cache"}), timeout=25) as response:
            html = response.read().decode("utf-8")
            if (response.status != 200 or escape(title) not in html or
                    ('rel="canonical" href="' + url + '"') not in html or
                    '<article class="prose"' not in html or "Official sources" not in html):
                raise ValueError("Public article body/canonical mismatch: " + url)
    now = datetime.now(timezone.utc).isoformat()
    for row in affected:
        row["state"] = "published"
        row["legacy_reconciled_at"] = now
        row["verified_deployment_sha"] = sha
        row["reconciliation_note"] = "Verified existing Notion completion and live page; original publication commit was not inferred"
    tmp = ledger.with_suffix(".jsonl.reconcile.tmp")
    tmp.write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows),
                   encoding="utf-8")
    os.replace(tmp, ledger)
    return {"status": "RECONCILED", "count": len(affected), "verified_deployment_sha": sha}

if __name__ == "__main__":
    try:
        print(json.dumps(reconcile(), ensure_ascii=False))
    except Exception as exc:
        raise SystemExit("LEGACY_RECONCILIATION_BLOCKED: " + str(exc))
