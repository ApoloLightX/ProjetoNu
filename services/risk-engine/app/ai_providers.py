import json
import os
import time
from copy import deepcopy
from typing import TypeVar

import httpx
from pydantic import BaseModel, ValidationError

from .schemas import AIReviewerOutput, AIRiskAnalysis

T = TypeVar("T", bound=BaseModel)

GEMINI_INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions"


class AIProviderNotConfigured(RuntimeError):
    pass


class AIProviderError(RuntimeError):
    pass


def _strict_compatible_schema(model: type[BaseModel]) -> dict:
    """Normalize Pydantic JSON Schema for broad structured-output compatibility."""
    schema = deepcopy(model.model_json_schema())

    def visit(node: object) -> None:
        if isinstance(node, dict):
            for key in [
                "title",
                "default",
                "examples",
                "minLength",
                "maxLength",
                "minItems",
                "maxItems",
            ]:
                node.pop(key, None)

            if node.get("type") == "object" and "properties" in node:
                properties = node["properties"]
                if isinstance(properties, dict):
                    node["required"] = list(properties.keys())
                    node["additionalProperties"] = False

            for value in node.values():
                visit(value)
        elif isinstance(node, list):
            for item in node:
                visit(item)

    visit(schema)
    return schema


def _extract_gemini_text(payload: dict) -> str:
    direct = payload.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct

    for step in reversed(payload.get("steps", [])):
        if step.get("type") != "model_output":
            continue
        text_parts = [
            item.get("text", "")
            for item in step.get("content", [])
            if item.get("type") == "text" and isinstance(item.get("text"), str)
        ]
        if text_parts:
            return "".join(text_parts)

    raise AIProviderError("Gemini returned no model text output.")


def _validate_json(text: str, model: type[T], provider: str) -> T:
    try:
        return model.model_validate(json.loads(text))
    except (json.JSONDecodeError, ValidationError) as exc:
        raise AIProviderError(f"{provider} returned invalid structured output.") from exc


class GeminiAnalystClient:
    provider = "gemini"
    role = "ANALYST"

    def __init__(
        self,
        api_key: str,
        model: str = "gemini-3.6-flash",
        *,
        client: httpx.Client | None = None,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self._owns_client = client is None
        self.client = client or httpx.Client(timeout=30.0)

    @classmethod
    def from_env(cls) -> "GeminiAnalystClient":
        key = os.environ.get("GEMINI_API_KEY", "").strip()
        if not key:
            raise AIProviderNotConfigured("GEMINI_API_KEY is not configured.")
        return cls(key, os.environ.get("GEMINI_MODEL", "gemini-3.6-flash").strip())

    def close(self) -> None:
        if self._owns_client:
            self.client.close()

    def analyze(self, prompt: str) -> tuple[AIRiskAnalysis, int]:
        started = time.perf_counter()
        try:
            response = self.client.post(
                GEMINI_INTERACTIONS_URL,
                headers={
                    "x-goog-api-key": self.api_key,
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "input": prompt,
                    "generation_config": {"thinking_level": "low"},
                    "response_format": {
                        "type": "text",
                        "mime_type": "application/json",
                        "schema": _strict_compatible_schema(AIRiskAnalysis),
                    },
                },
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise AIProviderError(
                f"Gemini request failed with HTTP {exc.response.status_code}."
            ) from exc
        except httpx.RequestError as exc:
            raise AIProviderError("Gemini request is unavailable.") from exc

        latency_ms = int((time.perf_counter() - started) * 1000)
        output = _validate_json(_extract_gemini_text(response.json()), AIRiskAnalysis, "Gemini")
        return output, latency_ms


class GroqReviewerClient:
    provider = "groq"
    role = "REVIEWER"

    def __init__(
        self,
        api_key: str,
        model: str = "openai/gpt-oss-20b",
        *,
        client: httpx.Client | None = None,
    ) -> None:
        self.api_key = api_key
        self.model = model
        self._owns_client = client is None
        self.client = client or httpx.Client(timeout=30.0)

    @classmethod
    def from_env(cls) -> "GroqReviewerClient":
        key = os.environ.get("GROQ_API_KEY", "").strip()
        if not key:
            raise AIProviderNotConfigured("GROQ_API_KEY is not configured.")
        return cls(key, os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b").strip())

    def close(self) -> None:
        if self._owns_client:
            self.client.close()

    def review(self, prompt: str) -> tuple[AIReviewerOutput, int]:
        started = time.perf_counter()
        try:
            response = self.client.post(
                GROQ_CHAT_URL,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "You are an independent SAC-risk reviewer. Challenge unsupported "
                                "claims and never infer facts that are absent from supplied evidence."
                            ),
                        },
                        {"role": "user", "content": prompt},
                    ],
                    "temperature": 0,
                    "response_format": {
                        "type": "json_schema",
                        "json_schema": {
                            "name": "atlas_sac_independent_review",
                            "strict": True,
                            "schema": _strict_compatible_schema(AIReviewerOutput),
                        },
                    },
                },
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise AIProviderError(
                f"Groq request failed with HTTP {exc.response.status_code}."
            ) from exc
        except httpx.RequestError as exc:
            raise AIProviderError("Groq request is unavailable.") from exc

        latency_ms = int((time.perf_counter() - started) * 1000)
        payload = response.json()
        try:
            text = payload["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AIProviderError("Groq returned no structured reviewer output.") from exc

        output = _validate_json(text, AIReviewerOutput, "Groq")
        return output, latency_ms
