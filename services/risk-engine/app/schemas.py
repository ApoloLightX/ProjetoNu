from datetime import datetime
from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


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


class MLBaselinePrediction(BaseModel):
    model_version: str
    dataset_version: str
    synthetic_dataset: bool = True
    predicted_material_risk_probability: float = Field(ge=0, le=1)
    elevated_at_demo_threshold: bool
    threshold: float = Field(ge=0, le=1)
    feature_values: dict[str, float]
    disclaimer: str


class MLBaselineEvaluation(BaseModel):
    model_version: str
    dataset_version: str
    synthetic_dataset: bool = True
    samples: int = Field(gt=0)
    test_samples: int = Field(gt=0)
    positive_rate: float = Field(ge=0, le=1)
    roc_auc: float = Field(ge=0, le=1)
    precision: float = Field(ge=0, le=1)
    recall: float = Field(ge=0, le=1)
    brier_score: float = Field(ge=0, le=1)
    threshold: float = Field(ge=0, le=1)
    excluded_from_features: list[str]
    disclaimer: str


class AIConfidence(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class AIAnalystAction(str, Enum):
    NO_ADDITIONAL_ACTION = "NO_ADDITIONAL_ACTION"
    HUMAN_REVIEW = "HUMAN_REVIEW"
    REQUEST_MORE_INFORMATION = "REQUEST_MORE_INFORMATION"


class AIReviewerVerdict(str, Enum):
    AGREE = "AGREE"
    CHALLENGE = "CHALLENGE"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


class AIReviewStatus(str, Enum):
    COMPLETE = "COMPLETE"
    DEGRADED = "DEGRADED"


class AIDecisionGate(str, Enum):
    ASSISTIVE_OUTPUT_ONLY = "ASSISTIVE_OUTPUT_ONLY"
    HUMAN_REVIEW_REQUIRED = "HUMAN_REVIEW_REQUIRED"
    DETERMINISTIC_ONLY = "DETERMINISTIC_ONLY"


class AITracePersistence(str, Enum):
    NOT_REQUESTED = "NOT_REQUESTED"
    STORED = "STORED"
    FAILED = "FAILED"


class AIClaim(BaseModel):
    model_config = ConfigDict(extra="forbid")

    finding: str = Field(min_length=3, max_length=800)
    evidence_refs: list[str] = Field(max_length=20)
    confidence: AIConfidence


class AIRiskAnalysis(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=5, max_length=1600)
    findings: list[AIClaim] = Field(max_length=12)
    uncertainty_flags: list[str] = Field(max_length=12)
    recommended_action: AIAnalystAction


class AIReviewerOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verdict: AIReviewerVerdict
    unsupported_claims: list[str] = Field(max_length=12)
    contradictions: list[str] = Field(max_length=12)
    rationale: str = Field(min_length=5, max_length=1600)
    review_required: bool


class AIAssessmentRequest(BaseModel):
    counterparty: CounterpartyRiskInput
    evidence: list[EvidenceInput] = Field(default_factory=list, max_length=40)
    assessment_run_id: UUID | None = None


class AIProviderRun(BaseModel):
    provider: str
    model: str
    role: str
    prompt_version: str
    input_hash: str
    latency_ms: int = Field(ge=0)


class AIAssessmentResponse(BaseModel):
    status: AIReviewStatus
    deterministic_assessment: SACAssessment
    ml_prediction: MLBaselinePrediction
    analyst: AIRiskAnalysis | None = None
    reviewer: AIReviewerOutput | None = None
    disagreement: bool | None = None
    decision_gate: AIDecisionGate
    degradation_reason: str | None = None
    provider_runs: list[AIProviderRun]
    trace_persistence: AITracePersistence = AITracePersistence.NOT_REQUESTED
    trace_persistence_reason: str | None = None
    disclaimer: str
