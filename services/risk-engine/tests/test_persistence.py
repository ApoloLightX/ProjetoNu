from datetime import UTC, datetime
from uuid import UUID

import httpx
from fastapi.testclient import TestClient

from app.main import app
from app.persistence import SupabaseRestRepository, stable_external_ref
from app.risk_engine import METHODOLOGY_VERSION, assess_counterparty
from app.schemas import CounterpartyRiskInput, EvidenceInput, PersistAssessmentRequest

RUN_ID = UUID("11111111-1111-4111-8111-111111111111")
COUNTERPARTY_ID = UUID("22222222-2222-4222-8222-222222222222")


def _counterparty() -> CounterpartyRiskInput:
    return CounterpartyRiskInput(
        company_name="Empresa Sintética",
        sector="Produtos florestais",
        region="Pará, Brasil",
        sector_environmental_exposure=0.82,
        geographic_environmental_exposure=0.78,
        climate_physical_exposure=0.74,
        climate_transition_exposure=0.63,
        social_signal_strength=0.52,
        environmental_event_strength=0.86,
        reputational_signal_strength=0.58,
        evidence_completeness=0.56,
    )


def _request() -> PersistAssessmentRequest:
    return PersistAssessmentRequest(
        counterparty=_counterparty(),
        evidence=[
            EvidenceInput(
                evidence_type="public_demo_signal",
                source_name="Synthetic fixture",
                observed_at=datetime(2026, 8, 18, tzinfo=UTC),
                payload={"signal": "demo-only"},
            )
        ],
    )


def test_generated_external_ref_is_stable_and_does_not_expose_company_name():
    first = stable_external_ref(_request())
    second = stable_external_ref(_request())

    assert first == second
    assert first.startswith("synthetic:")
    assert "empresa" not in first


def test_persist_assessment_calls_atomic_rpc_with_snapshots():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["path"] = request.url.path
        captured["body"] = request.read().decode("utf-8")
        return httpx.Response(200, json=str(RUN_ID))

    client = httpx.Client(transport=httpx.MockTransport(handler))
    repository = SupabaseRestRepository(
        "https://atlas.example.supabase.co",
        "test-service-role",
        client=client,
    )
    request = _request()
    assessment = assess_counterparty(request.counterparty)

    run_id = repository.persist_assessment(request, assessment, METHODOLOGY_VERSION)

    assert run_id == RUN_ID
    assert captured["path"].endswith("/rest/v1/rpc/persist_assessment_snapshot")
    assert '"p_methodology_version":"atlas-sac-v0.2"' in captured["body"]
    assert '"p_human_review_required":true' in captured["body"]
    assert '"p_evidence"' in captured["body"]


def test_fetch_assessment_rehydrates_immutable_result_snapshot():
    assessment = assess_counterparty(_counterparty())

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/rest/v1/assessment_runs")
        return httpx.Response(
            200,
            json=[
                {
                    "id": str(RUN_ID),
                    "counterparty_id": str(COUNTERPARTY_ID),
                    "methodology_version": METHODOLOGY_VERSION,
                    "input_snapshot": _counterparty().model_dump(mode="json"),
                    "result_snapshot": assessment.model_dump(mode="json"),
                    "created_at": "2026-08-18T17:40:00Z",
                }
            ],
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    repository = SupabaseRestRepository(
        "https://atlas.example.supabase.co",
        "test-service-role",
        client=client,
    )

    replay = repository.fetch_assessment(RUN_ID)

    assert replay.run_id == RUN_ID
    assert replay.counterparty_id == COUNTERPARTY_ID
    assert replay.assessment.overall_score == assessment.overall_score
    assert replay.assessment.human_review_required is True


def test_persist_endpoint_fails_closed_when_supabase_is_not_configured(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)
    client = TestClient(app)

    response = client.post(
        "/v1/assessments/persist",
        json={
            "counterparty": _counterparty().model_dump(mode="json"),
            "evidence": [],
            "is_synthetic": True,
        },
    )

    assert response.status_code == 503
    assert "not configured" in response.json()["detail"].lower()
