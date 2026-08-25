from fastapi.testclient import TestClient

from app.main import app
from app.persistence import PersistenceError, SupabaseRestRepository

client = TestClient(app)


def test_health_generates_request_id_and_security_header(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["x-request-id"]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.json()["database"] == "not_configured"


def test_health_reports_database_ready_when_supabase_probe_succeeds(monkeypatch):
    class HealthyRepository:
        def healthcheck(self) -> None:
            return None

        def close(self) -> None:
            return None

    monkeypatch.setattr(
        SupabaseRestRepository,
        "from_env",
        classmethod(lambda cls: HealthyRepository()),
    )

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["database"] == "ok"


def test_health_fails_when_supabase_probe_fails(monkeypatch):
    class FailingRepository:
        def healthcheck(self) -> None:
            raise PersistenceError("database unavailable")

        def close(self) -> None:
            return None

    monkeypatch.setattr(
        SupabaseRestRepository,
        "from_env",
        classmethod(lambda cls: FailingRepository()),
    )

    response = client.get("/health")

    assert response.status_code == 503
    assert response.json()["detail"] == "Supabase dependency healthcheck failed."


def test_request_id_is_propagated_when_valid(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    response = client.get("/health", headers={"X-Request-ID": "atlas-test-123"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "atlas-test-123"


def test_request_id_rejects_untrusted_shape(monkeypatch):
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    response = client.get("/health", headers={"X-Request-ID": "contains spaces"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] != "contains spaces"


def test_public_web_origin_can_preflight_json_post():
    response = client.options(
        "/v1/assessments",
        headers={
            "Origin": "https://atlas-sac-ui.vercel.app",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,x-request-id",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://atlas-sac-ui.vercel.app"
    assert "POST" in response.headers["access-control-allow-methods"]
