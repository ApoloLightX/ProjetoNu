from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class MicroReadinessStatus(str, Enum):
    INSUFFICIENT_HISTORY = "INSUFFICIENT_HISTORY"
    NEEDS_MORE_EVIDENCE = "NEEDS_MORE_EVIDENCE"
    EVIDENCE_READY_FOR_REVIEW = "EVIDENCE_READY_FOR_REVIEW"


class MonthlyCashflowObservation(BaseModel):
    period: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    inflows: float = Field(ge=0, le=1_000_000_000_000)
    outflows: float = Field(ge=0, le=1_000_000_000_000)


class MicroReadinessRequest(BaseModel):
    business_name: str = Field(min_length=2, max_length=200)
    observations: list[MonthlyCashflowObservation] = Field(min_length=3, max_length=24)
    largest_customer_share: float | None = Field(default=None, ge=0, le=1)
    monthly_debt_service: float | None = Field(
        default=None,
        ge=0,
        le=1_000_000_000_000,
    )
    source_label: str = Field(default="synthetic_demo", min_length=2, max_length=120)
    is_synthetic: Literal[True] = True

    @model_validator(mode="after")
    def validate_observation_periods(self) -> "MicroReadinessRequest":
        periods = [item.period for item in self.observations]
        if len(periods) != len(set(periods)):
            raise ValueError("Cash-flow observation periods must be unique.")
        return self


class MicroReadinessMetrics(BaseModel):
    periods_observed: int = Field(ge=0)
    average_monthly_inflow: float = Field(ge=0)
    average_monthly_outflow: float = Field(ge=0)
    average_net_cashflow: float
    positive_cashflow_month_ratio: float = Field(ge=0, le=1)
    inflow_coefficient_of_variation: float | None = Field(default=None, ge=0)
    largest_customer_share: float | None = Field(default=None, ge=0, le=1)
    debt_service_to_average_inflow: float | None = Field(default=None, ge=0)


class MicroReadinessResponse(BaseModel):
    business_name: str
    status: MicroReadinessStatus
    evidence_coverage: float = Field(ge=0, le=1)
    metrics: MicroReadinessMetrics
    data_gaps: list[str]
    explanations: list[str]
    is_synthetic: Literal[True] = True
    credit_decision_produced: Literal[False] = False
    disclaimer: str
