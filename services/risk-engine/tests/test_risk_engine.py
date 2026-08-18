from app.risk_engine import assess_counterparty
from app.schemas import CounterpartyRiskInput, RiskBand


def _base(**overrides):
    data = {
        "company_name": "Empresa Demo",
        "sector": "Serviços",
        "region": "São Paulo, SP",
        "sector_environmental_exposure": 0.20,
        "geographic_environmental_exposure": 0.20,
        "climate_physical_exposure": 0.20,
        "climate_transition_exposure": 0.20,
        "social_signal_strength": 0.10,
        "environmental_event_strength": 0.10,
        "reputational_signal_strength": 0.10,
        "evidence_completeness": 0.90,
    }
    data.update(overrides)
    return CounterpartyRiskInput(**data)


def test_low_risk_complete_evidence_does_not_force_review():
    result = assess_counterparty(_base())
    assert result.overall_band == RiskBand.LOW
    assert result.human_review_required is False
    assert result.confidence == 0.90


def test_missing_evidence_forces_human_review_even_when_score_is_low():
    result = assess_counterparty(_base(evidence_completeness=0.35))
    assert result.overall_band == RiskBand.LOW
    assert result.human_review_required is True
    assert "insufficient evidence completeness" in result.review_reasons


def test_high_observed_company_signal_cannot_be_hidden_by_low_inherent_risk():
    result = assess_counterparty(
        _base(
            social_signal_strength=0.90,
            environmental_event_strength=0.95,
            reputational_signal_strength=0.90,
        )
    )
    assert result.observed_risk.band == RiskBand.HIGH
    assert result.human_review_required is True
    assert "high company-specific observed signal" in result.review_reasons


def test_inherent_and_observed_risk_remain_separate():
    result = assess_counterparty(
        _base(
            sector_environmental_exposure=0.90,
            geographic_environmental_exposure=0.85,
            climate_physical_exposure=0.80,
            climate_transition_exposure=0.75,
            social_signal_strength=0.05,
            environmental_event_strength=0.05,
            reputational_signal_strength=0.05,
        )
    )
    assert result.inherent_risk.band == RiskBand.HIGH
    assert result.observed_risk.band == RiskBand.LOW
