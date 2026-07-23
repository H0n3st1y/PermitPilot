from __future__ import annotations

from datetime import UTC, date, datetime
from enum import StrEnum
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


class Status(StrEnum):
    NOT_STARTED = "not_started"
    PREPARING = "preparing"
    READY = "ready_to_submit"
    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    CHANGES = "changes_requested"
    INSPECTION = "inspection_scheduled"
    APPROVED = "approved"
    REJECTED = "rejected"
    NA = "not_applicable"


class ProjectIntake(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    project_type: str
    property_type: Literal["residential", "commercial"] = "residential"
    owner_status: Literal["owner", "renter"] = "owner"
    home_based: bool = False
    food_preparation: bool = False
    public_attendance: bool = False
    temporary: bool = False
    square_footage: int | None = Field(None, ge=0, le=1_000_000)
    visitor_count: int | None = Field(None, ge=0, le=1_000_000)
    desired_start_date: date | None = None
    notes: str = Field("", max_length=2000)


class Source(BaseModel):
    id: str
    title: str
    department: str
    official_url: str | None = None
    code_section: str | None = None
    page_number: int | None = None
    excerpt: str | None = None
    effective_date: date | None = None
    retrieval_date: date
    verification_status: Literal["verified", "needs_review", "demo"]
    content_hash: str


class DocumentDefinition(BaseModel):
    id: str
    title: str
    category: str


class DurationEstimate(BaseModel):
    minimum_days: int = Field(ge=0)
    maximum_days: int = Field(ge=0)
    basis: str = "Configured demonstration planning range"


class Requirement(BaseModel):
    id: str
    title: str
    short_title: str
    department: str
    category: str
    description: str
    plain_language_explanation: str
    why_required: str
    applicability: Literal["required", "possibly_required", "informational"] = "required"
    verification_status: Literal["verified", "needs_review", "demo"] = "demo"
    dependencies: list[str] = []
    parallel_with: list[str] = []
    required_documents: list[DocumentDefinition] = []
    duration_estimate: DurationEstimate
    source_ids: list[str] = []
    questions_for_department: list[str] = []


class EvaluationTrace(BaseModel):
    requirement_id: str
    matched_rule_id: str
    reason: str
    matched_conditions: list[str]


class EvaluationResult(BaseModel):
    requirements: list[Requirement]
    traces: list[EvaluationTrace]
    warnings: list[str]


class Milestone(BaseModel):
    id: str
    requirement_id: str
    title: str
    department: str
    status: Status = Status.NOT_STARTED
    dependency_ids: list[str] = []
    parallel_group_id: str | None = None
    estimated_duration_minimum_days: int
    estimated_duration_maximum_days: int
    estimated_start_date: date
    estimated_end_date: date
    next_action: str
    is_blocking: bool = False
    is_critical_path: bool = False
    source_ids: list[str] = []


class Project(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    owner_id: str = "demo-user"
    municipality_id: str = "demo-harbor-ma"
    intake: ProjectIntake
    requirements: list[Requirement] = []
    milestones: list[Milestone] = []
    traces: list[EvaluationTrace] = []
    warnings: list[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class StatusUpdate(BaseModel):
    status: Status
    note: str = Field("", max_length=1000)


class ApiResponse(BaseModel):
    data: Any | None = None
    error: dict[str, Any] | None = None
