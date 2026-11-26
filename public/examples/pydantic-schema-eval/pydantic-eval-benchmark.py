"""GuideHollow Contract Smoke-Test Suite: Pydantic v2 JSON Schema Validation.

Note: This script is a deterministic contract verification suite (smoke test)
that validates boundary rules, null vs. missing keys, empty arrays, regex IDs,
and extra-key rejection against ActionItemModel. It does NOT execute live LLM
API generations or produce empirical model pass-rate benchmarks.
"""

from __future__ import annotations

import csv
import json
from enum import Enum
from pathlib import Path
from typing import Annotated, List, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationError

TASK_ID_PATTERN = r"^ACT-\d{3}$"
EMAIL_PATTERN = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"


class PriorityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


TaskIdStr = Annotated[str, Field(pattern=TASK_ID_PATTERN)]


class ActionItemModel(BaseModel):
    """Strict contract matching the dual-pole few-shot prompt specification."""

    model_config = ConfigDict(extra="forbid")

    task_id: str = Field(
        ...,
        pattern=TASK_ID_PATTERN,
        description="Unique task identifier in ACT-001 format",
    )
    assignee_email: str = Field(
        ...,
        pattern=EMAIL_PATTERN,
        description="Corporate email address of assignee",
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=200,
        description="Concise description of the deliverable",
    )
    priority: PriorityEnum = Field(
        ...,
        description="Exact triage priority level",
    )
    estimated_hours: float = Field(
        ...,
        gt=0.1,
        lt=40.0,
        description="Estimated effort strictly between 0.1 and 40.0 hours",
    )
    blocking_tasks: List[TaskIdStr] = Field(
        ...,
        description="Required array of ACT-### task IDs; [] when no blockers exist (null rejected)",
    )
    resolution_notes: Optional[str] = Field(
        ...,
        description="Required key; string when resolved or explicit null when unresolved",
    )


def validate_ai_json(raw_json: str) -> dict:
    """Strip optional markdown fences and validate raw JSON against ActionItemModel."""
    cleaned = raw_json.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()

    try:
        item = ActionItemModel.model_validate_json(cleaned)
        return {"status": "VALID", "model": item.model_dump(), "errors": []}
    except ValidationError as exc:
        return {"status": "INVALID", "model": None, "errors": exc.errors()}


def run_contract_smoke_tests() -> None:
    base = {
        "task_id": "ACT-882",
        "assignee_email": "sarah.chen@company.com",
        "description": "Migrate primary auth database and verify cluster snapshots",
        "priority": "CRITICAL",
        "estimated_hours": 35.5,
        "blocking_tasks": ["ACT-104", "ACT-105"],
        "resolution_notes": "Backup snapshots verified",
    }

    cases = [
        ("TC-01", "VALID", base),
        (
            "TC-02",
            "VALID",
            {
                "task_id": "ACT-003",
                "assignee_email": "marcus@company.com",
                "description": "Draft release changelog for upcoming deployment",
                "priority": "LOW",
                "estimated_hours": 0.5,
                "blocking_tasks": [],
                "resolution_notes": None,
            },
        ),
        ("TC-03", "VALID", {**base, "task_id": "ACT-409", "estimated_hours": 39.9, "blocking_tasks": [], "resolution_notes": None}),
        ("TC-04", "INVALID", {**base, "estimated_hours": 0.1}),
        ("TC-05", "INVALID", {**base, "estimated_hours": 40.0}),
        ("TC-06", "INVALID", {**base, "blocking_tasks": None}),
        ("TC-07", "INVALID", {k: v for k, v in base.items() if k != "resolution_notes"}),
        ("TC-08", "INVALID", {**base, "unexpected_field": "hallucinated"}),
        ("TC-09", "INVALID", {**base, "blocking_tasks": ["TASK-104"]}),
        ("TC-10", "INVALID", {**base, "priority": "Urgent"}),
    ]

    for case_id, expected, payload in cases:
        res = validate_ai_json(json.dumps(payload))
        assert res["status"] == expected, f"{case_id} expected {expected}, got {res}"

    # Verify JSON Schema export enforces additionalProperties=false and required keys
    schema = ActionItemModel.model_json_schema()
    assert schema.get("additionalProperties") is False
    assert set(schema.get("required", [])) == {
        "task_id",
        "assignee_email",
        "description",
        "priority",
        "estimated_hours",
        "blocking_tasks",
        "resolution_notes",
    }

    # Verify companion CSV matrix stays aligned with executable smoke-test cases
    csv_path = Path(__file__).with_name("benchmark-results.csv")
    if csv_path.exists():
        with csv_path.open(encoding="utf-8", newline="") as fh:
            rows = list(csv.DictReader(fh))
        assert [r["case_id"] for r in rows] == [c[0] for c in cases]
        assert [r["expected_status"] for r in rows] == [c[1] for c in cases]

    print(f"Contract smoke tests passed: {len(cases)}/{len(cases)} (extra='forbid', strict 0.1 < hours < 40.0)")


if __name__ == "__main__":
    run_contract_smoke_tests()
