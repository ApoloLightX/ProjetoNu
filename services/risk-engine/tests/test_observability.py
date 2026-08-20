import json
import logging

from app.observability import bind_request_id, current_request_id, log_event, reset_request_id


def test_structured_event_includes_bound_request_id(caplog):
    token = bind_request_id("atlas-observability-test")
    try:
        with caplog.at_level(logging.INFO, logger="atlas.telemetry"):
            log_event(
                "dependency_completed",
                dependency="fixture",
                operation="probe",
                duration_ms=12.5,
            )
    finally:
        reset_request_id(token)

    payload = json.loads(caplog.records[-1].message)
    assert payload == {
        "event": "dependency_completed",
        "request_id": "atlas-observability-test",
        "dependency": "fixture",
        "operation": "probe",
        "duration_ms": 12.5,
    }
    assert current_request_id() is None


def test_structured_event_does_not_require_request_context(caplog):
    with caplog.at_level(logging.INFO, logger="atlas.telemetry"):
        log_event("background_probe", component="test")

    payload = json.loads(caplog.records[-1].message)
    assert payload["event"] == "background_probe"
    assert payload["component"] == "test"
    assert "request_id" not in payload
