#!/usr/bin/env python3
"""Audit synthetic Unicode pairs without rewriting the original strings."""
import hashlib
import json
from pathlib import Path
import sys
import unicodedata


def codepoints(text):
    return [f"U+{ord(char):04X}" for char in text]


root = Path(__file__).resolve().parent
source = root / "fixture.json"
original_bytes = source.read_bytes()
pairs = json.loads(original_bytes)["pairs"]

# Explicit expectations detect accidental changes to the teaching fixture.
expected = {
    "accent": ([0x63, 0x61, 0x66, 0xE9], [0x63, 0x61, 0x66, 0x65, 0x301], True, True),
    "hangul": ([0xAC00], [0x1100, 0x1161], True, True),
    "space": ([0x4E, 0x6F, 0x72, 0x74, 0x68, 0xA0, 0x54, 0x65, 0x61, 0x6D],
              [0x4E, 0x6F, 0x72, 0x74, 0x68, 0x20, 0x54, 0x65, 0x61, 0x6D], False, True),
    "compatibility-id": ([0x2460], [0x31], False, True),
    "typo-control": ([0x4E, 0x6F, 0x72, 0x74, 0x68, 0x20, 0x54, 0x65, 0x61, 0x6D],
                     [0x4E, 0x72, 0x6F, 0x74, 0x68, 0x20, 0x54, 0x65, 0x61, 0x6D], False, False),
    "homograph-control": ([0x70, 0x61, 0x79, 0x70, 0x61, 0x6C],
                         [0x70, 0x430, 0x79, 0x70, 0x61, 0x6C], False, False),
}
assert len(pairs) == len(expected)
assert {pair["id"] for pair in pairs} == set(expected)
rows = []
for pair in pairs:
    name, left, right = pair["id"], pair["left"], pair["right"]
    left_points, right_points, nfc_equal, nfkc_equal = expected[name]
    assert [ord(char) for char in left] == left_points, name
    assert [ord(char) for char in right] == right_points, name
    comparisons = {"raw": left == right}
    for form in ("NFC", "NFKC"):
        normalized_left = unicodedata.normalize(form, left)
        normalized_right = unicodedata.normalize(form, right)
        comparisons[form] = normalized_left == normalized_right
        for text in (normalized_left, normalized_right):
            assert unicodedata.normalize(form, text) == text, (name, form)
    assert comparisons == {"raw": False, "NFC": nfc_equal, "NFKC": nfkc_equal}, name
    rows.append({
        "id": name,
        "left": left,
        "right": right,
        "left_codepoints": codepoints(left),
        "right_codepoints": codepoints(right),
        "equal": comparisons,
    })

# Compatibility normalization can collapse two intentionally distinct source IDs.
source_ids = next(pair for pair in pairs if pair["id"] == "compatibility-id")
ids = [source_ids["left"], source_ids["right"]]
assert len(set(ids)) == 2
assert len({unicodedata.normalize("NFKC", text) for text in ids}) == 1
assert source.read_bytes() == original_bytes, "Original fixture bytes changed"

result = {
    "fixture_sha256": hashlib.sha256(original_bytes).hexdigest(),
    "python_version": sys.version.split()[0],
    "unicode_database_version": unicodedata.unidata_version,
    "self_checks": "PASS",
    "original_fixture_bytes_unchanged": True,
    "rows": rows,
    "compatibility_collision": {"original_distinct_ids": 2, "NFKC_distinct_keys": 1},
    "interpretation": "A normalized match is a comparison result, not permission to merge records. Approve the matching policy before changing data; preserve original values.",
}
output = root / "results.json"
output.write_text(json.dumps(result, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
assert source.read_bytes() == original_bytes, "Original fixture bytes changed"
print(f"Python {result['python_version']}; Unicode {unicodedata.unidata_version}")
print("pair                  raw    NFC    NFKC")
for row in rows:
    flags = "  ".join(str(row["equal"][form]).ljust(5) for form in ("raw", "NFC", "NFKC"))
    print(f"{row['id']:21} {flags}")
print("Self-checks: PASS; original fixture bytes unchanged.")
print("Distinct IDs before/after NFKC: 2 -> 1. Review policy before merging.")
print("Original values were preserved. Results: results.json")
