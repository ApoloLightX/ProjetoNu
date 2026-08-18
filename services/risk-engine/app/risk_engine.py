from .schemas import (
    CounterpartyRiskInput,
    RiskBand,
    RiskDimension,
    SACAssessment,
)

METHODOLOGY_VERSION = "atlas-sac-v0.2"
METHODOLOGY = (
    "ATLAS SAC v0 demo heuristic. Scores are transparent normalized features for portfolio "
    "demonstration only. They are not calibrated probabilities, credit scores or regulatory ratings."
)


def _band(score: float) -> RiskBand:
    if score < 0.33:
        return RiskBand.LOW
    if score < 0.66:
        return RiskBand.MEDIUM
    return RiskBand.HIGH


def _dimension(score: float, drivers: list[str]) -> RiskDimension:
    score = round(max(0.0, min(1.0, score)), 4)
    return RiskDimension(score=score, band=_band(score), drivers=drivers)


def assess_counterparty(data: CounterpartyRiskInput) -> SACAssessment:
    inherent_score = (
        data.sector_environmental_exposure * 0.40
        + data.geographic_environmental_exposure * 0.20
        + data.climate_physical_exposure * 0.20
        + data.climate_transition_exposure * 0.20
    )

    observed_score = (
        data.environmental_event_strength * 0.40
        + data.social_signal_strength * 0.30
        + data.reputational_signal_strength * 0.30
    )

    social = _dimension(
        data.social_signal_strength,
        ["company-specific social signal strength"],
    )
    environmental = _dimension(
        data.sector_environmental_exposure * 0.30
        + data.geographic_environmental_exposure * 0.25
        + data.environmental_event_strength * 0.45,
        [
            "sector environmental exposure",
            "geographic environmental exposure",
            "observed environmental event strength",
        ],
    )
    climate_physical = _dimension(
        data.climate_physical_exposure,
        ["geographic physical climate exposure"],
    )
    climate_transition = _dimension(
        data.climate_transition_exposure,
        ["sector transition exposure"],
    )
    reputational = _dimension(
        data.reputational_signal_strength,
        ["company-specific reputational/context signal strength"],
    )
    inherent = _dimension(
        inherent_score,
        [
            "sector exposure",
            "geographic exposure",
            "physical climate exposure",
            "transition exposure",
        ],
    )
    observed = _dimension(
        observed_score,
        ["environmental events", "social signals", "reputational/context signals"],
    )

    # V0 deliberately prevents observed signals from being hidden by a low-risk sector.
    overall_score = round(inherent.score * 0.45 + observed.score * 0.55, 4)
    overall_band = _band(overall_score)
    confidence = round(data.evidence_completeness, 4)

    review_reasons: list[str] = []
    if overall_band == RiskBand.HIGH:
        review_reasons.append("high consolidated demo risk")
    if confidence < 0.60:
        review_reasons.append("insufficient evidence completeness")
    if observed.band == RiskBand.HIGH:
        review_reasons.append("high company-specific observed signal")
    if environmental.band == RiskBand.HIGH or social.band == RiskBand.HIGH:
        review_reasons.append("high material SAC dimension")

    return SACAssessment(
        company_name=data.company_name,
        inherent_risk=inherent,
        observed_risk=observed,
        social_risk=social,
        environmental_risk=environmental,
        climate_physical_risk=climate_physical,
        climate_transition_risk=climate_transition,
        reputational_context_risk=reputational,
        overall_score=overall_score,
        overall_band=overall_band,
        confidence=confidence,
        human_review_required=bool(review_reasons),
        review_reasons=review_reasons,
        methodology=METHODOLOGY,
    )
