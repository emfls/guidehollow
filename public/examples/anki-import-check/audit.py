#!/usr/bin/env python3
"""Read-only CSV checks against an editorial answer key, not an AI truth verifier."""
import csv
import hashlib
import io
import json
from pathlib import Path


def audit(rows, approved=None):
    seen, issues = set(), []
    for number, row in enumerate(rows, 1):
        codes = []
        if len(row) != 2:
            codes.append("FIELD_COUNT")
        elif not all(value.strip() for value in row):
            codes.append("EMPTY_FIELD")
        else:
            front, back = row
            if front in seen:
                codes.append("DUPLICATE_FRONT")
            seen.add(front)
            if approved is not None:
                if front not in approved:
                    codes.append("UNAPPROVED_FRONT")
                elif back != approved[front]:
                    codes.append("ANSWER_MISMATCH")
        if codes:
            issues.append({"row": number, "codes": codes})
    return {"status": "FAIL" if issues else "PASS", "rows": len(rows),
            "passing_rows": len(rows) - len(issues), "issues": issues}


key = {"Question?": "Answer"}
for row in (["Question?"], ["Question?", "Answer", "extra"]):
    assert audit([row], key)["issues"][0]["codes"] == ["FIELD_COUNT"]
assert audit([["Question?", " "]], key)["issues"][0]["codes"] == ["EMPTY_FIELD"]
assert audit([["Question?", "Changed"]], key)["issues"][0]["codes"] == ["ANSWER_MISMATCH"]
assert audit([["Question?", "Answer"]] * 2, key)["issues"] == [{"row": 2, "codes": ["DUPLICATE_FRONT"]}]
assert audit([["New question?", "Answer"]], key)["issues"][0]["codes"] == ["UNAPPROVED_FRONT"]
quoted = [["Exact booking keyword?", 'Maker, "Basics"']]
buffer = io.StringIO(newline="")
csv.writer(buffer).writerows(quoted)
assert list(csv.reader(io.StringIO(buffer.getvalue(), newline=""), strict=True)) == quoted
try:
    list(csv.reader(io.StringIO('"unfinished', newline=""), strict=True))
except csv.Error:
    pass
else:
    raise AssertionError("Malformed quoted CSV must fail")

root = Path(__file__).resolve().parent
inputs = [root / name for name in ("source-notes.txt", "reviewed.csv", "candidate.csv")]
original = {path: path.read_bytes() for path in inputs}
def read_csv(path):
    with path.open(encoding="utf-8", newline="") as source:
        return list(csv.reader(source, strict=True))
reviewed = read_csv(root / "reviewed.csv")
reviewed_result = audit(reviewed)
assert reviewed_result["status"] == "PASS" and len(reviewed) == 4
candidate_result = audit(read_csv(root / "candidate.csv"), dict(reviewed))
assert candidate_result["issues"] == [{"row": 1, "codes": ["ANSWER_MISMATCH"]},
                                     {"row": 5, "codes": ["DUPLICATE_FRONT"]}]
assert all(path.read_bytes() == data for path, data in original.items())
print(json.dumps({"scope": "Exact matches to a editorial answer key; no semantic fact verification or real Anki import.",
                  "reviewed": reviewed_result, "candidate": candidate_result, "self_checks": "PASS",
                  "input_bytes_unchanged": True,
                  "input_sha256": {path.name: hashlib.sha256(data).hexdigest() for path, data in original.items()}}, indent=2))
