#!/usr/bin/env python3
"""Read-only conversion of this fixed, unambiguous teaching fixture."""
from datetime import datetime, timedelta, timezone
import hashlib
import json
from pathlib import Path
import sys
from zoneinfo import ZoneInfo

root = Path(__file__).resolve().parent
paths = [root / "meetings.json", root / "candidate.json"]
original = {path: path.read_bytes() for path in paths}
meetings, candidate = [json.loads(original[path]) for path in paths]
assert set(meetings) == {"source_zone", "target_zone", "events"}
assert set(candidate) == {"target_zone", "events"}
assert meetings["source_zone"] == "America/New_York"
assert meetings["target_zone"] == candidate["target_zone"] == "Asia/Seoul"
expected = {
    "A": ("2026-10-26T09:00", "-04:00", "2026-10-26T13:00+00:00", "2026-10-26T22:00+09:00"),
    "B": ("2026-11-02T09:00", "-05:00", "2026-11-02T14:00+00:00", "2026-11-02T23:00+09:00"),
    "C": ("2026-11-02T21:00", "-05:00", "2026-11-03T02:00+00:00", "2026-11-03T11:00+09:00"),
}
for data, field in ((meetings, "source_local"), (candidate, "target_local")):
    assert isinstance(data["events"], list) and len(data["events"]) == 3
    for event in data["events"]:
        assert isinstance(event, dict) and set(event) == {"id", field}
        assert all(isinstance(value, str) and value.strip() for value in event.values())
    ids = [event["id"] for event in data["events"]]
    assert len(set(ids)) == 3 and set(ids) == set(expected)
proposed = {event["id"]: event["target_local"] for event in candidate["events"]}
source_zone = ZoneInfo(meetings["source_zone"])
target_zone = ZoneInfo(meetings["target_zone"])
rows, targets, sources = [], {}, {}
for event in meetings["events"]:
    event_id = event["id"]
    assert event["source_local"] == expected[event_id][0]
    local = datetime.fromisoformat(event["source_local"])
    assert local.tzinfo is None
    source = local.replace(tzinfo=source_zone)
    utc = source.astimezone(timezone.utc)
    target = utc.astimezone(target_zone)
    assert utc.astimezone(source_zone).replace(tzinfo=None) == local
    offset = source.isoformat(timespec="minutes")[-6:]
    utc_text, target_text = utc.isoformat(timespec="minutes"), target.isoformat(timespec="minutes")
    assert (offset, utc_text, target_text) == expected[event_id][1:]
    proposed_time = datetime.fromisoformat(proposed[event_id])
    assert proposed_time.tzinfo is not None and proposed_time.utcoffset() == timedelta(hours=9)
    sources[event_id], targets[event_id] = source, target
    rows.append({"id": event_id, "source_local": source.isoformat(timespec="minutes"),
                 "source_utc_offset": offset, "utc": utc_text, "target_local": target_text,
                 "candidate_target_local": proposed[event_id],
                 "status": "PASS" if proposed[event_id] == target_text else "FAIL"})
assert {row["id"]: row["status"] for row in rows} == {"A": "FAIL", "B": "PASS", "C": "FAIL"}
assert targets["B"].hour - targets["A"].hour == 1
assert sources["A"].utcoffset() - sources["B"].utcoffset() == timedelta(hours=1)
assert targets["C"].date() == sources["C"].date() + timedelta(days=1)
assert all(path.read_bytes() == content for path, content in original.items())
print(json.dumps({
    "scope": "Fictional local conversion exercise, not a live AI benchmark or calendar delivery check.",
    "validation_scope": "Only these supplied unambiguous source times; not a general DST ambiguity validator.",
    "python_version": sys.version.split()[0], "timezone_database_version": "UNKNOWN",
    "source_zone": meetings["source_zone"], "target_zone": meetings["target_zone"],
    "rows": rows, "same_09_source_target_hour_difference": 1, "next_day_target_ids": ["C"],
    "self_checks": "PASS", "input_bytes_unchanged": True,
    "input_sha256": {path.name: hashlib.sha256(content).hexdigest() for path, content in original.items()},
}, indent=2))
