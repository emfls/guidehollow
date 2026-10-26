#!/usr/bin/env python3
"""GuideHollow expansion control-plane registry, validation and offline planning.

This tool is intentionally read-only. It never creates repositories, alters DNS,
updates Notion, reads secrets, or dispatches workflows. New sites need reviewed
registry changes plus explicit operator activation in a *separate* workflow.
"""
import argparse
import json
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "ops" / "network" / "sites.json"
ROOT_DOMAIN = "guidehollow.com"
CONTROL_REPO = "emfls/guidehollow"
SITE_SLUG = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
SITE_ID = re.compile(r"^gh-[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
PERMITTED_REGISTRY = {"version", "control_repository", "root_domain",
                      "expansion_enabled", "cross_repo_publishing_enabled", "sites"}
PERMITTED_SITE = {"site_id", "repository", "hostname", "state",
                  "publication_enabled", "publisher", "daily_limit",
                  "notion_site_page_id"}
VALID_STATES = {"active", "preparing", "paused", "retired"}
VALID_PUBLISHERS = {"repo-local", "central"}
SHA_HEX = re.compile(r"^[a-f0-9]{32}$")


class PolicyError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise PolicyError(message)


def validate_site(site, owner, root_domain, control):
    require(isinstance(site, dict), "Site entry must be an object")
    require(set(site) == PERMITTED_SITE, "Site fields must match the published schema")
    site_id, repository = site["site_id"], site["repository"]
    hostname, state = site["hostname"], site["state"]
    require(isinstance(site_id, str) and SITE_ID.fullmatch(site_id), "Invalid site_id")
    require(isinstance(repository, str), "Invalid repository")
    require(isinstance(hostname, str), "Invalid hostname")
    require(state in VALID_STATES, "Unsupported state")
    require(type(site["publication_enabled"]) is bool, "publication_enabled must be boolean")
    require(site["publisher"] in VALID_PUBLISHERS, "Unsupported publisher")
    require(type(site["daily_limit"]) is int and 0 <= site["daily_limit"] <= 3,
            "Daily limit must be an integer between 0 and 3")
    page_id = site["notion_site_page_id"]
    require(page_id is None or
            (isinstance(page_id, str) and SHA_HEX.fullmatch(page_id.replace("-", ""))),
            "Invalid Notion site page ID")
    if site_id == "gh-main":
        require(repository == control and hostname == root_domain,
                "Main site repository and domain must never change")
        require(site["state"] == "active", "Main must remain active")
        require(site["publisher"] == "repo-local", "Main publisher must remain repo-local")
        require(site["publication_enabled"] is True, "Main publication flag must remain enabled")
        require(site["daily_limit"] == 3, "Main Daily Limit must remain 3")
        require(isinstance(page_id, str), "Main Notion page binding is mandatory")
    else:
        slug = site_id[3:]
        require(SITE_SLUG.fullmatch(slug), "Invalid satellite slug")
        require(repository == f"{owner}/guidehollow-{slug}", "Satellite repository naming mismatch")
        require(hostname == f"{slug}.{root_domain}", "Satellite domain naming mismatch")
        require(site["publisher"] == "central", "Future sites must use central publisher")
        require(state in {"preparing", "paused", "retired"},
                "Satellite activation is not authorized by the registry")
        require(site["publication_enabled"] is False, "Future publishing is disabled")
        require(site["daily_limit"] == 0, "Future Daily Limit must remain zero")
    return {"site_id": site_id, "repository": repository,
            "hostname": hostname, "state": state,
            "publication_enabled": site["publication_enabled"]}


def validate_registry(data):
    require(isinstance(data, dict), "Registry must be a JSON object")
    require(set(data) == PERMITTED_REGISTRY, "Registry schema mismatch or unexpected fields")
    require(type(data["version"]) is int and data["version"] == 1,
            "Unsupported registry version")
    require(data["control_repository"] == CONTROL_REPO, "Unexpected control repository")
    require(data["root_domain"] == ROOT_DOMAIN, "Unexpected DNS zone")
    require(data["expansion_enabled"] is False, "Expansion must remain explicitly disabled")
    require(data["cross_repo_publishing_enabled"] is False,
            "Cross-repo publishing must remain disabled")
    sites = data["sites"]
    require(isinstance(sites, list) and len(sites) >= 1, "At least main site is required")
    owner = data["control_repository"].split("/")[0]
    seen_ids, seen_repos, seen_domains = set(), set(), set()
    summary = []
    for site in sites:
        item = validate_site(site, owner, ROOT_DOMAIN, CONTROL_REPO)
        for key, value, seen in (
            ("site_id", item["site_id"], seen_ids),
            ("repository", item["repository"].casefold(), seen_repos),
            ("hostname", item["hostname"].casefold(), seen_domains),
        ):
            require(value not in seen, f"Duplicate {key}: {value}")
            seen.add(value)
        summary.append(item)
    require("gh-main" in seen_ids, "The main site must always exist")
    return {"status": "PASS", "mode": "MAIN_ONLY", "registered_sites": len(summary),
            "active_sites": sum(x["state"] == "active" for x in summary),
            "expansion_enabled": False, "cross_repo_publishing_enabled": False,
            "sites": summary}


def read_registry(path=MANIFEST):
    with Path(path).open("r", encoding="utf-8") as file:
        return json.load(file)


def preview_new_site(data, slug):
    audit = validate_registry(data)
    require(isinstance(slug, str) and SITE_SLUG.fullmatch(slug),
            "Site slug must contain only safe lowercase ASCII characters")
    require(slug != "main", "Cannot replace main site")
    candidate = {
        "site_id": f"gh-{slug}",
        "repository": f"emfls/guidehollow-{slug}",
        "hostname": f"{slug}.guidehollow.com",
        "state": "preparing",
        "publication_enabled": False,
        "publisher": "central",
        "daily_limit": 0,
        "notion_site_page_id": None,
    }
    validate_site(candidate, "emfls", ROOT_DOMAIN, CONTROL_REPO)
    require(not any(s["site_id"] == candidate["site_id"] or
                    s["repository"] == candidate["repository"] or
                    s["hostname"] == candidate["hostname"]
                    for s in audit["sites"]), "Site already registered")
    return {
        "status": "PLAN_ONLY", "changes_applied": False,
        "would_register": candidate,
        "manual_gates": [
            "Confirm business justification and human approval",
            "Verify repository exists before registering; do not auto-create",
            "Install least-privilege GitHub App on that repository",
            "Register Notion site page and approve access",
            "Prepare independent Astro design, sources and functional tests",
            "Verify GitHub Pages, exact SHA, DNS and HTTPS",
            "Manually pass one approved Notion article end-to-end",
            "Approve cross-repository publishing with a separate reviewed change",
        ],
    }


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", default=str(MANIFEST),
                        help="Read-only registry path (for local tests)")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("audit", help="Validate the current central registry without API requests")
    plan = sub.add_parser("plan", help="Generate a non-mutating future site proposal")
    plan.add_argument("--slug", required=True)
    options = parser.parse_args(argv)
    try:
        data = read_registry(options.registry)
        result = validate_registry(data) if options.command == "audit" else \
                 preview_new_site(data, options.slug)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    except (PolicyError, FileNotFoundError, json.JSONDecodeError) as exc:
        print(json.dumps({"status": "BLOCKED", "error": str(exc)}, ensure_ascii=False),
              file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
