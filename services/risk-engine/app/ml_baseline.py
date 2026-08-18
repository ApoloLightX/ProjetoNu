import math
import random
from dataclasses import dataclass
from functools import lru_cache

from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .schemas import CounterpartyRiskInput, MLBaselineEvaluation, MLBaselinePrediction

MODEL_VERSION = "synthetic-logreg-v1"
DATASET_VERSION = "atlas-sac-synthetic-v1"
DEFAULT_SEED = 20260818
DEFAULT_SAMPLES = 4000
DEMO_THRESHOLD = 0.50

FEATURE_NAMES = (
    "sector_environmental_exposure",
    "geographic_environmental_exposure",
    "climate_physical_exposure",
    "climate_transition_exposure",
    "social_signal_strength",
    "environmental_event_strength",
    "reputational_signal_strength",
)

EXCLUDED_FROM_FEATURES = [
    "company_name",
    "sector",
    "region",
    "evidence_completeness",
]

DISCLAIMER = (
    "Experimental baseline trained only on a versioned synthetic dataset. Metrics and probabilities "
    "do not represent real-world credit, regulatory or SAC-risk performance."
)


@dataclass(frozen=True)
class BaselineBundle:
    model: Pipeline
    evaluation: MLBaselineEvaluation


def _sigmoid(value: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, value))))


def generate_synthetic_dataset(
    samples: int = DEFAULT_SAMPLES,
    seed: int = DEFAULT_SEED,
) -> tuple[list[list[float]], list[int]]:
    """Generate transparent demo labels from a known latent function plus noise."""
    if samples < 200:
        raise ValueError("synthetic dataset requires at least 200 samples")

    rng = random.Random(seed)
    features: list[list[float]] = []
    labels: list[int] = []

    for _ in range(samples):
        row = [rng.betavariate(2.1, 2.1) for _ in FEATURE_NAMES]
        (
            sector_environmental,
            geographic_environmental,
            climate_physical,
            climate_transition,
            social_signal,
            environmental_event,
            reputational_signal,
        ) = row

        latent_logit = (
            -4.15
            + 1.15 * sector_environmental
            + 0.75 * geographic_environmental
            + 0.95 * climate_physical
            + 0.75 * climate_transition
            + 1.10 * social_signal
            + 1.55 * environmental_event
            + 0.95 * reputational_signal
            + 0.90 * geographic_environmental * environmental_event
            + rng.gauss(0.0, 0.40)
        )
        probability = _sigmoid(latent_logit)
        label = int(rng.random() < probability)

        features.append(row)
        labels.append(label)

    return features, labels


def feature_values(data: CounterpartyRiskInput) -> dict[str, float]:
    return {name: float(getattr(data, name)) for name in FEATURE_NAMES}


@lru_cache(maxsize=1)
def trained_baseline() -> BaselineBundle:
    features, labels = generate_synthetic_dataset()
    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.25,
        random_state=DEFAULT_SEED,
        stratify=labels,
    )

    model = Pipeline(
        steps=[
            ("scale", StandardScaler()),
            (
                "classifier",
                LogisticRegression(
                    max_iter=2000,
                    random_state=DEFAULT_SEED,
                ),
            ),
        ]
    )
    model.fit(x_train, y_train)

    probabilities = model.predict_proba(x_test)[:, 1]
    predictions = (probabilities >= DEMO_THRESHOLD).astype(int)

    evaluation = MLBaselineEvaluation(
        model_version=MODEL_VERSION,
        dataset_version=DATASET_VERSION,
        samples=len(features),
        test_samples=len(x_test),
        positive_rate=round(sum(labels) / len(labels), 4),
        roc_auc=round(float(roc_auc_score(y_test, probabilities)), 4),
        precision=round(float(precision_score(y_test, predictions, zero_division=0)), 4),
        recall=round(float(recall_score(y_test, predictions, zero_division=0)), 4),
        brier_score=round(float(brier_score_loss(y_test, probabilities)), 4),
        threshold=DEMO_THRESHOLD,
        excluded_from_features=EXCLUDED_FROM_FEATURES,
        disclaimer=DISCLAIMER,
    )
    return BaselineBundle(model=model, evaluation=evaluation)


def evaluate_baseline() -> MLBaselineEvaluation:
    return trained_baseline().evaluation


def predict_baseline(data: CounterpartyRiskInput) -> MLBaselinePrediction:
    bundle = trained_baseline()
    values = feature_values(data)
    ordered = [values[name] for name in FEATURE_NAMES]
    probability = float(bundle.model.predict_proba([ordered])[0][1])

    return MLBaselinePrediction(
        model_version=MODEL_VERSION,
        dataset_version=DATASET_VERSION,
        predicted_material_risk_probability=round(probability, 4),
        elevated_at_demo_threshold=probability >= DEMO_THRESHOLD,
        threshold=DEMO_THRESHOLD,
        feature_values=values,
        disclaimer=DISCLAIMER,
    )
