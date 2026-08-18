# ATLAS SAC ML Baseline

## Purpose

The ML baseline exists to demonstrate a reproducible model-development and evaluation workflow. It is **not** intended to estimate real credit loss, regulatory classification or real-world SAC risk.

There is no claim that the synthetic labels correspond to an institution's production labels or policy outcomes.

## Dataset

Version: `atlas-sac-synthetic-v1`

The dataset is generated deterministically with seed `20260818`. Each row contains seven normalized demo features:

1. `sector_environmental_exposure`
2. `geographic_environmental_exposure`
3. `climate_physical_exposure`
4. `climate_transition_exposure`
5. `social_signal_strength`
6. `environmental_event_strength`
7. `reputational_signal_strength`

The binary target `material_risk_event` is sampled from a documented latent logistic function combining those features, one interaction term and random noise. This makes the benchmark reproducible while preserving uncertainty.

## Deliberately excluded features

`evidence_completeness` is not an ML risk feature.

This is a governance decision. Missing evidence should affect **confidence and human-review requirements**, not mechanically make a counterparty look more or less risky. The deterministic engine owns that uncertainty rule.

The following identity/context fields are also excluded from the baseline:

- company name
- sector label
- region label

The demo uses normalized risk features rather than learning proxies from arbitrary names or locations.

## Model

Version: `synthetic-logreg-v1`

Pipeline:

```text
7 normalized risk features
        |
        v
StandardScaler
        |
        v
LogisticRegression
        |
        v
synthetic material-risk probability
```

A logistic regression is used before trying more complex candidates because it is fast, interpretable and establishes a transparent baseline. More complex models should only be added if they demonstrate a meaningful and explainable improvement.

## Evaluation

A fixed 75/25 stratified train/test split is used. The held-out report exposes:

- ROC-AUC for ranking/discrimination
- Precision at the demo threshold
- Recall at the demo threshold
- Brier score for probabilistic accuracy/calibration-oriented evaluation
- positive-class prevalence

The endpoint is:

```text
GET /v1/ml/evaluation
```

A counterparty can be scored with:

```text
POST /v1/ml/predict
```

## Leakage and validity risks

This baseline deliberately documents several risks instead of hiding them:

### Synthetic-label circularity

The target is generated from the same conceptual feature family used for training. Good metrics therefore demonstrate that the pipeline can recover the synthetic relationship, not that it generalizes to real counterparties.

### Distribution shift

Real SAC-risk features may have very different distributions, missingness patterns and correlations. The synthetic beta distributions are an engineering fixture only.

### Policy leakage

No real approval/rejection decisions are used as labels. If future work uses human review outcomes, those outcomes must be checked for policy feedback loops and temporal leakage before training.

### Geographic and sector proxies

Raw company names, sector strings and region strings are excluded from this baseline. A future production-grade system would require explicit governance around protected characteristics, proxies, fairness and legitimate risk relevance.

### Evidence completeness

Evidence completeness is intentionally separated from predicted risk. It remains a confidence/review feature in the deterministic layer.

## Interpretation rule

The ML probability is an **additional signal**. It does not override deterministic rules, evidence traceability or human-review gates.

A future AI analyst may explain model and evidence outputs, but an LLM will not become the source of the numeric risk score.
