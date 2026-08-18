from app.ml_baseline import (
    EXCLUDED_FROM_FEATURES,
    FEATURE_NAMES,
    evaluate_baseline,
    generate_synthetic_dataset,
    predict_baseline,
)
from app.schemas import CounterpartyRiskInput


def _input(evidence_completeness: float = 0.60) -> CounterpartyRiskInput:
    return CounterpartyRiskInput(
        company_name="Empresa Demo",
        sector="Infraestrutura",
        region="São Paulo, SP",
        sector_environmental_exposure=0.72,
        geographic_environmental_exposure=0.48,
        climate_physical_exposure=0.54,
        climate_transition_exposure=0.65,
        social_signal_strength=0.35,
        environmental_event_strength=0.70,
        reputational_signal_strength=0.42,
        evidence_completeness=evidence_completeness,
    )


def test_synthetic_dataset_is_reproducible_and_versionable():
    x1, y1 = generate_synthetic_dataset(samples=250, seed=123)
    x2, y2 = generate_synthetic_dataset(samples=250, seed=123)

    assert x1 == x2
    assert y1 == y2
    assert 0 < sum(y1) < len(y1)


def test_evidence_completeness_is_not_an_ml_risk_feature():
    assert "evidence_completeness" not in FEATURE_NAMES
    assert "evidence_completeness" in EXCLUDED_FROM_FEATURES

    low_evidence = predict_baseline(_input(evidence_completeness=0.10))
    high_evidence = predict_baseline(_input(evidence_completeness=0.95))

    assert (
        low_evidence.predicted_material_risk_probability
        == high_evidence.predicted_material_risk_probability
    )


def test_baseline_reports_holdout_discrimination_and_calibration_metrics():
    evaluation = evaluate_baseline()

    assert evaluation.synthetic_dataset is True
    assert evaluation.samples == 4000
    assert evaluation.test_samples == 1000
    assert 0.10 < evaluation.positive_rate < 0.90
    assert 0.60 < evaluation.roc_auc <= 1.0
    assert 0.0 <= evaluation.precision <= 1.0
    assert 0.0 <= evaluation.recall <= 1.0
    assert 0.0 <= evaluation.brier_score <= 1.0
    assert "evidence_completeness" in evaluation.excluded_from_features


def test_prediction_exposes_features_and_synthetic_disclaimer():
    prediction = predict_baseline(_input())

    assert prediction.model_version == "synthetic-logreg-v1"
    assert prediction.synthetic_dataset is True
    assert set(prediction.feature_values) == set(FEATURE_NAMES)
    assert 0.0 <= prediction.predicted_material_risk_probability <= 1.0
    assert "synthetic" in prediction.disclaimer.lower()
