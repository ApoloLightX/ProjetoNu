import os
import re
import time
from uuid import UUID, uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from .ai_review import run_ai_assessment
from .company_registry import (
    BrasilApiCompanyRegistry,
    CompanyRegistryError,
    CompanyRegistryNotFound,
)
from .micro_readiness import assess_micro_readiness
from .micro_schemas import MicroReadinessRequest, MicroReadinessResponse
from .ml_baseline import evaluate_baseline, predict_baseline
from .observability import bind_request_id, log_event, reset_request_id
from .persistence import (
    PersistenceError,
    PersistenceNotConfigured,
    PersistenceNotFound,
    SupabaseRestRepository,
)
from .registry_schemas import CompanyRegistryProfile
from .risk_engine import METHODOLOGY_VERSION, assess_counterparty
from .schemas import (
    AIAssessmentRequest,
    AIAssessmentResponse,
    AITracePersistence,
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

APP_VERSION = "0.8.0"
REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9._:-]{1,128}$")

app = FastAPI(
    title="ATLAS Risk Engine",
    version=APP_VERSION,
    description=(
        "Experimental, explainable SAC risk and small-business evidence-readiness engine. "
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
    allow_headers=["Content-Type", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)


def _request_id(value: str | None) -> str:
    if value and REQUEST_ID_PATTERN.fullmatch(value):
        return value
    return uuid4().hex


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = _request_id(request.headers.get("x-request-id"))
    request.state.request_id = request_id
    token = bind_request_id(request_id)
    started = time.perf_counter()

    try:
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            log_event(
                "request_failed",
                level=40,
                exc_info=True,
                method=request.method,
                path=request.url.path,
                duration_ms=duration_ms,
            )
            raise

        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        log_event(
            "request_completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )
        return response
    finally:
        reset_request_id(token)


def _repository() -> SupabaseRestRepository:
    try:
        return SupabaseRestRepository.from_env()
    except PersistenceNotConfigured as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


def _persistence_http_error(exc: PersistenceError) -> HTTPException:
    return HTTPException(status_code=502, detail=str(exc))


def _persist_ai_trace(
    payload: AIAssessmentRequest,
    response: AIAssessmentResponse,
) -> AIAssessmentResponse:
    if payload.assessment_run_id is None:
        return response

    try:
        repository = SupabaseRestRepository.from_env()
    except PersistenceNotConfigured as exc:
        response.trace_persistence = AITracePersistence.FAILED
        response.trace_persistence_reason = str(exc)
        return response

    try:
        for provider_run in response.provider_runs:
            if provider_run.role == "ANALYST" and response.analyst is not None:
                structured_output = response.analyst.model_dump(mode="json")
            elif provider_run.role == "REVIEWER" and response.reviewer is not None:
                structured_output = response.reviewer.model_dump(mode="json")
            else:
                continue

            repository.record_ai_run(
                payload.assessment_run_id,
                provider_run,
                structured_output,
            )
    except PersistenceError as exc:
        response.trace_persistence = AITracePersistence.FAILED
        response.trace_persistence_reason = str(exc)
    else:
        response.trace_persistence = AITracePersistence.STORED
        response.trace_persistence_reason = None
    finally:
        repository.close()

    return response


@app.get("/health")
def health() -> dict[str, str]:
    database_status = "not_configured"
    try:
        repository = SupabaseRestRepository.from_env()
    except PersistenceNotConfigured:
        repository = None
    else:
        try:
            repository.healthcheck()
        except PersistenceError as exc:
            log_event(
                "dependency_healthcheck_failed",
                level=40,
                dependency="supabase",
                error_type=type(exc).__name__,
            )
            raise HTTPException(
                status_code=503,
                detail="Supabase dependency healthcheck failed.",
            ) from exc
        finally:
            repository.close()
        database_status = "ok"

    return {
        "status": "ok",
        "service": "atlas-risk-engine",
        "version": APP_VERSION,
        "database": database_status,
    }


@app.get("/v1/registry/cnpj/{cnpj}", response_model=CompanyRegistryProfile)
def registry_cnpj_lookup(cnpj: str) -> CompanyRegistryProfile:
    registry = BrasilApiCompanyRegistry()
    try:
        return registry.fetch(cnpj)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except CompanyRegistryNotFound as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except CompanyRegistryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    finally:
        registry.close()


@app.post("/v1/assessments", response_model=SACAssessment)
def create_assessment(payload: CounterpartyRiskInput) -> SACAssessment:
    return assess_counterparty(payload)


@app.post("/v1/micro/readiness", response_model=MicroReadinessResponse)
def micro_readiness(payload: MicroReadinessRequest) -> MicroReadinessResponse:
    return assess_micro_readiness(payload)


@app.get("/v1/ml/evaluation", response_model=MLBaselineEvaluation)
def ml_baseline_evaluation() -> MLBaselineEvaluation:
    return evaluate_baseline()


@app.post("/v1/ml/predict", response_model=MLBaselinePrediction)
def ml_baseline_prediction(payload: CounterpartyRiskInput) -> MLBaselinePrediction:
    return predict_baseline(payload)


@app.post("/v1/ai/assess", response_model=AIAssessmentResponse)
def ai_assisted_assessment(payload: AIAssessmentRequest) -> AIAssessmentResponse:
    response = run_ai_assessment(payload)
    return _persist_ai_trace(payload, response)


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