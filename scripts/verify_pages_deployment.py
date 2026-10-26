#!/usr/bin/env python3
"""Verify a dispatched Pages run at the exact article SHA; never trigger a release."""
import json
import os
import re
import subprocess
import time

ATTEMPTS = 70


def verify(sha):
    if not re.fullmatch(r"[a-f0-9]{40}", sha):
        raise ValueError("Invalid article SHA")
    for attempt in range(ATTEMPTS):
        runs = json.loads(subprocess.check_output([
            "gh", "run", "list", "--repo", os.environ["GITHUB_REPOSITORY"],
            "--workflow", "deploy.yml", "--branch", "main", "--limit", "40",
            "--json", "headSha,conclusion,event,status"], text=True, timeout=30))
        matching = [r for r in runs if r["headSha"] == sha and r["event"] == "workflow_dispatch"]
        # gh lists newest first. A prior success cannot override a newer failed deployment.
        if matching and matching[0]["status"] == "completed":
            if matching[0]["conclusion"] == "success":
                return sha
            raise RuntimeError("PAGES_DEPLOYMENT_FAILED: " + str(matching[0]["conclusion"]))
        if attempt + 1 < ATTEMPTS:
            time.sleep(12)
    raise RuntimeError("PAGES_DEPLOYMENT_TIMEOUT: exact article SHA is not proven deployed")


if __name__ == "__main__":
    print("VERIFIED_PAGES_SHA=" + verify(os.environ["ARTICLE_SHA"]))
