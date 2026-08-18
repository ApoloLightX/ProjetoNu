import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .risk_engine import assess_counterparty
from .schemas import CounterpartyRiskInput, SACAssessment

app = FastAPI(
    title="ATLAS SAC Risk Engine",
    version="0.2.0",
    description=(
        "Experimental, explainable social, environmental and climate risk engine. "
        "Portfolio use only; not for real credit decisions."
    ),
)

allowed_origins = [
    origin.strip()
    for origin in os.environ.get(
        "RISK_ENGINE_ALLOWED_ORIGINS",
        "http://localhost:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "atlas-sac-risk-engine", "version": "0.2.0"}


@app.post("/v1/assessments", response_model=SACAssessment)
def create_assessment(payload: CounterpartyRiskInput) -> SACAssessment:
    return assess_counterparty(payload)
