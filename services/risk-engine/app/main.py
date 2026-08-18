from fastapi import FastAPI

from .risk_engine import assess_counterparty
from .schemas import CounterpartyRiskInput, SACAssessment

app = FastAPI(
    title="ATLAS SAC Risk Engine",
    version="0.1.0",
    description=(
        "Experimental, explainable social, environmental and climate risk engine. "
        "Portfolio use only; not for real credit decisions."
    ),
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "atlas-sac-risk-engine", "version": "0.1.0"}


@app.post("/v1/assessments", response_model=SACAssessment)
def create_assessment(payload: CounterpartyRiskInput) -> SACAssessment:
    return assess_counterparty(payload)
