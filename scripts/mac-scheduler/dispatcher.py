#!/usr/bin/env python3
"""Main-only GitHub slot dispatcher for macOS launchd; fail closed."""
import argparse
import base64
from datetime import datetime, timedelta
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")
REPO = "emfls/guidehollow"
WORKFLOW = "notion-daily-publisher.yml"
SLOTS = (("morning", 9), ("afternoon", 15), ("evening", 21))
DIR = Path.home() / "Library/Application Support/GuideHollowMainScheduler"
STATE = DIR / "dispatch-state.json"


def slot_window(now):
    now = now.astimezone(KST)
    for slot, hour in SLOTS:
        due = now.replace(hour=hour, minute=17, second=0, microsecond=0)
        if due <= now <= due + timedelta(minutes=60):
            return slot, due
    return None, None


def gh(*args):
    cmd = [os.getenv("GUIDEHOLLOW_GH", "gh"), *args]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=50)
    if result.returncode:
        raise RuntimeError("GH_FAILED: " + " ".join(args[:2]) +
                           " (exit " + str(result.returncode) + ")")
    return result.stdout


def fetch_evidence():
    raw = json.loads(gh("api", "repos/emfls/guidehollow/contents/data/"
                            "guidehollow-publication-ledger.jsonl?ref=main"))
    if not isinstance(raw, dict) or raw.get("encoding") != "base64":
        raise RuntimeError("LEDGER_UNVERIFIED")
    ledger = [json.loads(x) for x in base64.b64decode(raw["content"]).decode().splitlines() if x.strip()]
    if any(not isinstance(x, dict) for x in ledger):
        raise RuntimeError("LEDGER_INVALID")
    r = json.loads(gh("api", "repos/emfls/guidehollow/actions/workflows/"
                          "notion-daily-publisher.yml/runs?per_page=100"))
    if not isinstance(r, dict) or not isinstance(r.get("workflow_runs"), list):
        raise RuntimeError("RUN_LIST_UNVERIFIED")
    return ledger, r["workflow_runs"]


def check_evidence(records, runs, slot, due):
    today = due.date().isoformat()
    own = [x for x in records if x.get("site_id") == "gh-main" and x.get("kst_date") == today]
    if any(x.get("state") not in {"staged", "published"} for x in own):
        return "LEDGER_UNKNOWN_STATE"
    if any(x.get("state") == "staged" for x in own):
        return "LEDGER_UNRESOLVED"
    if len(own) >= 3:
        return "DAILY_LIMIT_REACHED"
    if any(x.get("slot") == slot for x in own):
        return "SLOT_ALREADY_USED"
    for run in runs:
        if not isinstance(run, dict):
            raise RuntimeError("RUN_LIST_INVALID")
        if run.get("event") not in {"schedule", "workflow_dispatch"}:
            continue
        created = run.get("created_at")
        if not isinstance(created, str):
            raise RuntimeError("RUN_CREATED_MISSING")
        at = datetime.fromisoformat(created.replace("Z", "+00:00")).astimezone(KST)
        if due <= at <= due + timedelta(minutes=60):
            return "PUBLISHER_ALREADY_TRIGGERED"
    return "CLEAR"


def load_state(path):
    if not path.exists():
        return {}
    state = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(state, dict):
        raise RuntimeError("LOCAL_STATE_INVALID")
    return state


def save_state(path, state):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.chmod(tmp, 0o600)
    tmp.replace(path)


def emit(status, **info):
    print(json.dumps({"time": datetime.now(KST).isoformat(), "status": status, **info},
                     ensure_ascii=False), flush=True)


def tick(now=None, state_file=STATE, dispatch=True):
    now = (now or datetime.now(KST)).astimezone(KST)
    slot, due = slot_window(now)
    if slot is None:
        return "OUTSIDE_WINDOW"
    state_file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (state_file.parent / "dispatcher.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        key = f"{due.date().isoformat()}:{slot}"
        state = load_state(state_file)
        if key in state and state[key].get("status") in {"sent", "uncertain"}:
            emit("ALREADY_SENT_OR_UNCERTAIN", slot=slot)
            return "ALREADY_SENT_OR_UNCERTAIN"
        records, runs = fetch_evidence()
        reason = check_evidence(records, runs, slot, due)
        if reason != "CLEAR" or not dispatch:
            emit(reason if dispatch else "DRY_RUN_" + reason, slot=slot)
            return reason
        state[key] = {"status": "uncertain", "attempted_at": now.isoformat()}
        save_state(state_file, state)
        # Exact, named slot. Cannot consume a later slot if this one is used.
        output = gh("workflow", "run", WORKFLOW, "--repo", REPO, "--ref", "main",
                    "-f", "slot=" + slot)
        state[key] = {"status": "sent", "attempted_at": now.isoformat()}
        save_state(state_file, state)
        emit("DISPATCHED", slot=slot, response=output.strip()[:250])
        return "DISPATCHED"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["tick", "diagnose"])
    args = parser.parse_args()
    try:
        if args.command == "diagnose":
            ledger, runs = fetch_evidence()
            today = datetime.now(KST).date().isoformat()
            own = [x for x in ledger if x.get("site_id") == "gh-main" and x.get("kst_date") == today]
            emit("DIAGNOSE_OK", today=today, slots_used=[x.get("slot") for x in own],
                 unconfirmed=[x.get("page_id") for x in own if x.get("state") == "staged"],
                 recent_runs=len(runs), no_dispatch=True)
        else:
            tick()
        return 0
    except Exception as exc:
        emit("FAILED_SAFE_NO_RETRY_AFTER_UNCERTAIN_SEND", error=str(exc)[:250])
        return 2


if __name__ == "__main__":
    sys.exit(main())
