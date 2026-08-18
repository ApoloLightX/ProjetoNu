import os
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .ai_review import run_ai_assessment
from .ml_baseline import evaluate_baseline, predict_baseline
from .persistence import (
    PersistenceError,
    PersistenceNotConfigured,
    PersistenceNotFound,
    SupabaseRestRepository,
)
from .risk_engine import METHODOLOGY_VERSION, assess_counterparty
from .schemas import (
    AIAssessmentRequest,
    AIAssessmentResponse,
    CounterpartyRiskInput,
    HumanReviewRequest,
    HumanReviewResponse,
    MLBaselineEvaluation,
    MLBaselinePrediction,
    PersistAssessmentRequest,
    PersistedAssessmentResponse,
    ReplayAssessmentResponse,
    SACAssessment,
)

app = FastAPI(
    title="ATLAS SAC Risk Engine",
    version="0.5.0",
    description=(
        "Experimental, explainable social, environmental and climate risk engine. "
        "Portfolio use only; not for real credit decisions."
    ),
)

allowed_origins = [
    origin.strip()
    for origin in os.environ.get("RISK_ENGINE_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def _repository() -> SupabaseRestRepository:
    try:
        return SupabaseRestRepository.from_env()
    except PersistenceNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def _persistence_http_error(exc: PersistenceError) -> HTTPException:
    return HTTPException(status_code=502, detail=str(exc))


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "atlas-sac-risk-engine", "version": "0.5.0"}


@app.post("/v1/assessments", response_model=SACAssessment)
def create_assessment(payload: CounterpartyRiskInput) -> SACAssessment:
    return assess_counterparty(payload)


@app.get("/v1/ml/evaluation", response_model=MLBaselineEvaluation)
def ml_baseline_evaluation() -> MLBaselineEvaluation:
    return evaluate_baseline()


@app.post("/v1/ml/predict", response_model=MLBaselinePrediction)
def ml_baseline_prediction(payload: CounterpartyRiskInput) -> MLBaselinePrediction:
    return predict_baseline(payload)


@app.post("/v1/ai/assess", response_model=AIAssessmentResponse)
def ai_assisted_assessment(payload: AIAssessmentRequest) -> AIAssessmentResponse:
    return run_ai_assessment(payload)


@app.post("/v1/assessments/persist", response_model=PersistedAssessmentResponse)
def persist_assessment(payload: PersistAssessmentRequest) -> PersistedAssessmentResponse:
    assessment = assess_counterparty(payload.counterparty)
    repository = _repository()
    try:
        run_id = repository.persist_assessment(
            payload, assessment, methodology_version=METHODOLOGY_VERSION
        )
    except PersistenceError as exc:
        raise _persistence_http_error(exc) from exc
    finally:
        repository.close()
    return PersistedAssessmentResponse(run_id=run_id, assessment=assessment)


@app.get("/v1/assessments/{run_id}", response_model=ReplayAssessmentResponse)
def replay_assessment(run_id: UUID) -> ReplayAssessmentResponse:
    repository = _repository()
    try:
        return repository.fetch_assessment(run_id)
    except PersistenceNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PersistenceError as exc:
        raise _persistence_http_error(exc) from exc
    finally:
        repository.close()


@app.post("/v1/assessments/{run_id}/reviews", response_model=HumanReviewResponse)
def record_human_review(run_id: UUID, payload: HumanReviewRequest) -> HumanReviewResponse:
    repository = _repository()
    try:
        review_id = repository.record_human_review(run_id, payload)
    except PersistenceError as exc:
        raise _persistence_http_error(exc) from exc
    finally:
        repository.close()
    return HumanReviewResponse(
        review_id=review_id,
        assessment_run_id=run_id,
        decision=payload.decision,
    )
