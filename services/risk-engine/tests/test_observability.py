import json
import logging
from io import StringIO

from app.observability import (
    bind_request_id,
    current_request_id,
    log_event,
    logger,
    reset_request_id,
)


def _capture_event(callback):
    stream = StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
    try:
        callback()
        handler.flush()
    finally:
        logger.removeHandler(handler)
    return json.loads(stream.getvalue().strip().splitlines()[-1])


def test_structured_event_includes_bound_request_id():
    token = bind_request_id("atlas-observability-test")
    try:
        payload = _capture_event(
            lambda: log_event(
                "dependency_completed",
                dependency="fixture",
                operation="probe",
                duration_ms=12.5,
            )
        )
    finally:
        reset_request_id(token)

    assert payload == {
        "event": "dependency_completed",
        "request_id": "atlas-observability-test",
        "dependency": "fixture",
        "operation": "probe",
        "duration_ms": 12.5,
    }
    assert current_request_id() is None


def test_structured_event_does_not_require_request_context():
    payload = _capture_event(lambda: log_event("background_probe", component="test"))

    assert payload["event"] == "background_probe"
    assert payload["component"] == "test"
    assert "request_id" not in payload
