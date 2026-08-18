from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class RiskBand(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ReviewDecision(str, Enum):
    CONFIRM = "CONFIRM"
    OVERRIDE = "OVERRIDE"
    REQUEST_MORE_INFO = "REQUEST_MORE_INFO"


class CounterpartyRiskInput(BaseModel):
    company_name: str = Field(min_length=2, max_length=200)
    sector: str = Field(min_length=2, max_length=120)
    region: str = Field(min_length=2, max_length=120)

    # Demo features normalized to 0..1.
    sector_environmental_exposure: float = Field(ge=0, le=1)
    geographic_environmental_exposure: float = Field(ge=0, le=1)
    climate_physical_exposure: float = Field(ge=0, le=1)
    climate_transition_exposure: float = Field(ge=0, le=1)
    social_signal_strength: float = Field(ge=0, le=1)
    environmental_event_strength: float = Field(ge=0, le=1)
    reputational_signal_strength: float = Field(ge=0, le=1)
    evidence_completeness: float = Field(ge=0, le=1)


class RiskDimension(BaseModel):
    score: float = Field(ge=0, le=1)
    band: RiskBand
    drivers: list[str]


class SACAssessment(BaseModel):
    company_name: str
    inherent_risk: RiskDimension
    observed_risk: RiskDimension
    social_risk: RiskDimension
    environmental_risk: RiskDimension
    climate_physical_risk: RiskDimension
    climate_transition_risk: RiskDimension
    reputational_context_risk: RiskDimension
    overall_score: float = Field(ge=0, le=1)
    overall_band: RiskBand
    confidence: float = Field(ge=0, le=1)
    human_review_required: bool
    review_reasons: list[str]
    methodology: str


class EvidenceInput(BaseModel):
    evidence_type: str = Field(min_length=2, max_length=120)
    source_name: str = Field(min_length=2, max_length=200)
    source_url: str | None = Field(default=None, max_length=2000)
    observed_at: datetime | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    is_synthetic: bool = True


class PersistAssessmentRequest(BaseModel):
    counterparty: CounterpartyRiskInput
    external_ref: str | None = Field(default=None, min_length=3, max_length=160)
    evidence: list[EvidenceInput] = Field(default_factory=list, max_length=100)
    is_synthetic: bool = True


class PersistedAssessmentResponse(BaseModel):
    run_id: UUID
    assessment: SACAssessment


class ReplayAssessmentResponse(BaseModel):
    run_id: UUID
    counterparty_id: UUID
    methodology_version: str
    input_snapshot: dict[str, Any]
    assessment: SACAssessment
    created_at: datetime


class HumanReviewRequest(BaseModel):
    reviewer_ref: str = Field(min_length=2, max_length=160)
    decision: ReviewDecision
    rationale: str = Field(min_length=5, max_length=4000)


class HumanReviewResponse(BaseModel):
    review_id: UUID
    assessment_run_id: UUID
    decision: ReviewDecision
