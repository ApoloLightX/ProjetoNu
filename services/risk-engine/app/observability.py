import json
import logging
import os
from contextvars import ContextVar, Token
from typing import Any

_REQUEST_ID: ContextVar[str | None] = ContextVar("atlas_request_id", default=None)
logger = logging.getLogger("atlas.telemetry")
logger.setLevel(
    getattr(logging, os.environ.get("RISK_ENGINE_LOG_LEVEL", "INFO").upper(), logging.INFO)
)

if not logger.handlers:
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(_handler)
logger.propagate = False


def bind_request_id(request_id: str) -> Token:
    return _REQUEST_ID.set(request_id)


def reset_request_id(token: Token) -> None:
    _REQUEST_ID.reset(token)


def current_request_id() -> str | None:
    return _REQUEST_ID.get()


def log_event(
    event: str,
    *,
    level: int = logging.INFO,
    exc_info: bool = False,
    **fields: Any,
) -> None:
    payload: dict[str, Any] = {"event": event}
    request_id = current_request_id()
    if request_id:
        payload["request_id"] = request_id
    payload.update(fields)
    logger.log(
        level,
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=str),
        exc_info=exc_info,
    )
