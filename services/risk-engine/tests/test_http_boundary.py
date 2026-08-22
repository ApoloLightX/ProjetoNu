from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_generates_request_id_and_security_header():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.headers["x-request-id"]
    assert response.headers["x-content-type-options"] == "nosniff"


def test_request_id_is_propagated_when_valid():
    response = client.get("/health", headers={"X-Request-ID": "atlas-test-123"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] == "atlas-test-123"


def test_request_id_rejects_untrusted_shape():
    response = client.get("/health", headers={"X-Request-ID": "contains spaces"})

    assert response.status_code == 200
    assert response.headers["x-request-id"] != "contains spaces"
