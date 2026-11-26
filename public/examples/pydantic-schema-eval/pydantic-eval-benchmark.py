"""GuideHollow Benchmark Suite: Pydantic v2 JSON Schema Validation for AI Completions."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ValidationError

class PriorityEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class ActionItemModel(BaseModel):
    task_id: str = Field(..., pattern=r"^ACT-\d{3}$")
    assignee_email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    description: str = Field(..., min_length=10, max_length=200)
    priority: PriorityEnum
    estimated_hours: float = Field(..., gt=0.0, le=40.0)
    blocking_tasks: Optional[List[str]] = Field(default_factory=list)

def validate_ai_payload(json_dict):
    try:
        item = ActionItemModel.model_validate(json_dict)
        return {"status": "VALID", "model": item.model_dump()}
    except ValidationError as e:
        return {"status": "INVALID", "errors": e.errors()}

if __name__ == "__main__":
    # Test valid payload
    valid_test = {
        "task_id": "ACT-101",
        "assignee_email": "engineer@example.com",
        "description": "Implement database connection pooling",
        "priority": "HIGH",
        "estimated_hours": 4.5,
        "blocking_tasks": []
    }
    res = validate_ai_payload(valid_test)
    assert res["status"] == "VALID"
    print("Benchmark Pydantic validation: PASS")
