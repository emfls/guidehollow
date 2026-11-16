#!/usr/bin/env python3
"""Read fictional JSON manifests; never scan or rename the paths they describe."""
from collections import Counter
import hashlib
import json
from pathlib import Path, PurePosixPath
import re
import sys


def fields(row, keys):
    return isinstance(row, dict) and set(row) == keys and all(isinstance(v, str) and v.strip() for v in row.values())


def basename(name):
    return bool(re.fullmatch(r"[A-Za-z0-9._-]+", name)) and name not in (".", "..") and not name.endswith((".", " "))


def audit(inventory, proposals):
    if not isinstance(inventory, list) or not inventory or not isinstance(proposals, list) or not proposals:
        raise ValueError("Expected nonempty inventory and proposal lists")
    if any(not fields(row, {"id", "name", "label"}) or not basename(row["name"]) for row in inventory):
        raise ValueError("Invalid inventory fields or basename")
    by_id = {row["id"]: row["name"] for row in inventory}
    originals = {row["name"].casefold() for row in inventory}
    if len(by_id) != len(inventory) or len(originals) != len(inventory):
        raise ValueError("Inventory IDs and filenames must be unique")
    if any(not fields(row, {"id", "source", "target"}) for row in proposals):
        raise ValueError("Invalid proposal fields")
    ids = Counter(row["id"] for row in proposals)
    sources = Counter(row["source"].casefold() for row in proposals)
    targets = Counter(row["target"].casefold() for row in proposals)
    rows = []
    for row in proposals:
        issues, target = [], row["target"]
        if row["id"] not in by_id:
            issues.append("UNKNOWN_SOURCE")
        elif row["source"] != by_id[row["id"]]:
            issues.append("SOURCE_NAME_MISMATCH")
        if ids[row["id"]] > 1 or sources[row["source"].casefold()] > 1:
            issues.append("DUPLICATE_SOURCE")
        if not basename(target):
            issues.append("INVALID_BASENAME")
        elif row["id"] in by_id and PurePosixPath(target).suffix != PurePosixPath(by_id[row["id"]]).suffix:
            issues.append("CHANGED_SUFFIX")
        if targets[target.casefold()] > 1:
            issues.append("TARGET_COLLISION")
        if target.casefold() in originals:
            issues.append("EXISTING_TARGET")
        rows.append({**row, "status": "FAIL" if issues else "PASS", "issues": issues})
    flagged = sum(bool(row["issues"]) for row in rows)
    return {"status": "HOLD" if flagged else "CLEAR", "inventory_count": len(inventory),
            "proposal_count": len(proposals), "flagged": flagged, "clear": len(rows) - flagged, "rows": rows}


root = Path(__file__).resolve().parent
paths = [root / "inventory.json", root / "candidate.json"]
original = {path: path.read_bytes() for path in paths}
inventory_doc, candidate_doc = [json.loads(original[path]) for path in paths]
assert isinstance(inventory_doc, dict) and set(inventory_doc) == {"files"}
assert isinstance(candidate_doc, dict) and set(candidate_doc) == {"renames"}
inventory, proposals = inventory_doc["files"], candidate_doc["renames"]
result = audit(inventory, proposals)
assert result["inventory_count"] == 5 and result["proposal_count"] == 4
assert [row["issues"] for row in result["rows"]] == [["TARGET_COLLISION"], ["TARGET_COLLISION"], ["INVALID_BASENAME"], []]
assert result["status"] == "HOLD" and result["flagged"] == 3 and result["clear"] == 1
corrected = [dict(row, target=name) for row, name in zip(proposals, [
    "north-invoice-2026-10.pdf", "south-invoice-2026-10.pdf", "team-notes.txt", "staff-list.csv"])]
assert audit(inventory, corrected)["status"] == "CLEAR"
sample = corrected[0]
for target in ("../notes.pdf", "folder\\notes.pdf", ".", "..", "name\x00.pdf", "name.pdf.", "name.pdf "):
    assert "INVALID_BASENAME" in audit(inventory, [dict(sample, target=target)])["rows"][0]["issues"]
for changes, code in (({"target": "summary.txt"}, "EXISTING_TARGET"), ({"id": "UNKNOWN"}, "UNKNOWN_SOURCE"),
                      ({"source": "wrong.pdf"}, "SOURCE_NAME_MISMATCH"), ({"target": "invoice.txt"}, "CHANGED_SUFFIX")):
    assert code in audit(inventory, [dict(sample, **changes)])["rows"][0]["issues"]
assert all("DUPLICATE_SOURCE" in row["issues"] for row in audit(inventory, [sample, sample])["rows"])
for bad in (dict(sample, target=""), dict(sample, target=None), dict(sample, target=3), {"id": "A"}):
    try:
        audit(inventory, [bad])
    except ValueError:
        pass
    else:
        raise AssertionError("Malformed proposal must fail closed")
for bad_inventory in (inventory + [inventory[0]], inventory + [dict(inventory[0], id="EXTRA")]):
    try:
        audit(bad_inventory, corrected)
    except ValueError:
        pass
    else:
        raise AssertionError("Duplicate inventory identity must fail closed")
assert all(path.read_bytes() == data for path, data in original.items())
print(json.dumps({
    "scope": "Fictional manifest-only teaching policy, not a live AI benchmark or proof of filesystem safety or complete portability.",
    "policy": "ASCII basenames; exact source names and suffixes; casefold collisions; all original names reserved. No chains or swaps.",
    "python_version": sys.version.split()[0], "batch": result, "self_checks": "PASS",
    "corrected_in_memory_status": "CLEAR", "input_bytes_unchanged": True,
    "rename_move_delete_actions": "NOT_RUN",
    "input_sha256": {path.name: hashlib.sha256(data).hexdigest() for path, data in original.items()},
}, indent=2))
