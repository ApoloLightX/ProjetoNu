import pytest
from pydantic import ValidationError

from app.micro_readiness import assess_micro_readiness
from app.micro_schemas import MicroReadinessRequest, MicroReadinessStatus, MonthlyCashflowObservation


def _observations(months: int) -> list[MonthlyCashflowObservation]:
    return [
        MonthlyCashflowObservation(
            period=f"2026-{month:02d}",
            inflows=10_000 + (month * 100),
            outflows=7_000 + (month * 50),
        )
        for month in range(1, months + 1)
    ]


def test_missing_optional_evidence_creates_gaps_not_adverse_decision():
    result = assess_micro_readiness(
        MicroReadinessRequest(
            business_name="Synthetic Bakery",
            observations=_observations(6),
        )
    )

    assert result.status is MicroReadinessStatus.NEEDS_MORE_EVIDENCE
    assert result.evidence_coverage == 0.5
    assert result.credit_decision_produced is False
    assert "Customer concentration is unknown." in result.data_gaps
    assert "Current monthly debt-service burden is unknown." in result.data_gaps


def test_complete_demo_packet_is_ready_for_human_review_not_credit_approval():
    result = assess_micro_readiness(
        MicroReadinessRequest(
            business_name="Synthetic Bakery",
            observations=_observations(6),
            largest_customer_share=0.2,
            monthly_debt_service=800,
        )
    )

    assert result.status is MicroReadinessStatus.EVIDENCE_READY_FOR_REVIEW
    assert result.evidence_coverage == 1.0
    assert result.data_gaps == []
    assert result.credit_decision_produced is False
    assert result.metrics.debt_service_to_average_inflow is not None


def test_short_history_is_explicitly_insufficient():
    result = assess_micro_readiness(
        MicroReadinessRequest(
            business_name="Synthetic Bakery",
            observations=_observations(3),
            largest_customer_share=0.2,
            monthly_debt_service=800,
        )
    )

    assert result.status is MicroReadinessStatus.INSUFFICIENT_HISTORY
    assert result.evidence_coverage == 0.75
    assert "Less than six monthly cash-flow periods are available." in result.data_gaps


def test_non_synthetic_input_is_rejected_in_v8_foundation():
    with pytest.raises(ValidationError):
        MicroReadinessRequest(
            business_name="Real Business",
            observations=_observations(6),
            is_synthetic=False,
        )


def test_duplicate_periods_are_rejected():
    duplicate = [
        MonthlyCashflowObservation(period="2026-01", inflows=1000, outflows=900),
        MonthlyCashflowObservation(period="2026-01", inflows=1200, outflows=950),
        MonthlyCashflowObservation(period="2026-02", inflows=1300, outflows=1000),
    ]

    with pytest.raises(ValidationError, match="periods must be unique"):
        MicroReadinessRequest(
            business_name="Synthetic Bakery",
            observations=duplicate,
        )
