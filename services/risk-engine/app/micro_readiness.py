from statistics import fmean, pstdev

from .micro_schemas import (
    MicroReadinessMetrics,
    MicroReadinessRequest,
    MicroReadinessResponse,
    MicroReadinessStatus,
)

MICRO_READINESS_METHODOLOGY = "atlas-micro-readiness-v0"


def _round_money(value: float) -> float:
    return round(value, 2)


def _round_ratio(value: float) -> float:
    return round(value, 4)


def assess_micro_readiness(payload: MicroReadinessRequest) -> MicroReadinessResponse:
    inflows = [item.inflows for item in payload.observations]
    outflows = [item.outflows for item in payload.observations]
    periods_observed = len(payload.observations)

    average_inflow = fmean(inflows)
    average_outflow = fmean(outflows)
    average_net = average_inflow - average_outflow
    positive_month_ratio = sum(
        1 for inflow, outflow in zip(inflows, outflows, strict=True) if inflow >= outflow
    ) / periods_observed

    inflow_variation: float | None
    if average_inflow > 0 and periods_observed > 1:
        inflow_variation = pstdev(inflows) / average_inflow
    else:
        inflow_variation = None

    debt_service_ratio: float | None = None
    if payload.monthly_debt_service is not None and average_inflow > 0:
        debt_service_ratio = payload.monthly_debt_service / average_inflow

    history_coverage = min(periods_observed / 6, 1.0) * 0.5
    concentration_coverage = 0.25 if payload.largest_customer_share is not None else 0.0
    debt_coverage = 0.25 if payload.monthly_debt_service is not None else 0.0
    evidence_coverage = history_coverage + concentration_coverage + debt_coverage

    data_gaps: list[str] = []
    if periods_observed < 6:
        data_gaps.append("Less than six monthly cash-flow periods are available.")
    if payload.largest_customer_share is None:
        data_gaps.append("Customer concentration is unknown.")
    if payload.monthly_debt_service is None:
        data_gaps.append("Current monthly debt-service burden is unknown.")

    if periods_observed < 6:
        status = MicroReadinessStatus.INSUFFICIENT_HISTORY
    elif data_gaps:
        status = MicroReadinessStatus.NEEDS_MORE_EVIDENCE
    else:
        status = MicroReadinessStatus.EVIDENCE_READY_FOR_REVIEW

    explanations = [
        (
            "Evidence coverage measures how much of this demonstration evidence packet is "
            "available; it is not a credit-risk score."
        ),
        (
            "Missing information creates an explicit data gap and does not become adverse "
            "evidence."
        ),
        (
            "Cash-flow metrics describe the supplied synthetic observations only and do not "
            "produce approval, denial, pricing or credit-limit recommendations."
        ),
    ]

    metrics = MicroReadinessMetrics(
        periods_observed=periods_observed,
        average_monthly_inflow=_round_money(average_inflow),
        average_monthly_outflow=_round_money(average_outflow),
        average_net_cashflow=_round_money(average_net),
        positive_cashflow_month_ratio=_round_ratio(positive_month_ratio),
        inflow_coefficient_of_variation=(
            _round_ratio(inflow_variation) if inflow_variation is not None else None
        ),
        largest_customer_share=(
            _round_ratio(payload.largest_customer_share)
            if payload.largest_customer_share is not None
            else None
        ),
        debt_service_to_average_inflow=(
            _round_ratio(debt_service_ratio) if debt_service_ratio is not None else None
        ),
    )

    return MicroReadinessResponse(
        business_name=payload.business_name,
        status=status,
        evidence_coverage=_round_ratio(evidence_coverage),
        metrics=metrics,
        data_gaps=data_gaps,
        explanations=explanations,
        disclaimer=(
            f"{MICRO_READINESS_METHODOLOGY} is a synthetic portfolio demonstration. "
            "It is not a credit score and must not be used to approve, deny, price or size "
            "real credit."
        ),
    )
