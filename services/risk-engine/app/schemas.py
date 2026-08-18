from enum import Enum
from pydantic import BaseModel, Field


class RiskBand(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


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
