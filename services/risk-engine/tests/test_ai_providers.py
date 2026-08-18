import json

import httpx

from app.ai_providers import GeminiAnalystClient, GroqReviewerClient
from app.schemas import AIReviewerVerdict


ANALYST_JSON = {
    "summary": "Evidence-limited demo analysis.",
    "findings": [
        {
            "finding": "Observed evidence requires context.",
            "evidence_refs": ["E1"],
            "confidence": "MEDIUM",
        }
    ],
    "uncertainty_flags": ["Synthetic evidence"],
    "recommended_action": "HUMAN_REVIEW",
}

REVIEWER_JSON = {
    "verdict": "CHALLENGE",
    "unsupported_claims": ["Observed evidence is not sufficient for a causal statement."],
    "contradictions": [],
    "rationale": "The conclusion should remain under human review.",
    "review_required": True,
}


def test_gemini_uses_interactions_structured_output_and_validates_response():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["headers"] = dict(request.headers)
        captured["body"] = json.loads(request.read().decode("utf-8"))
        return httpx.Response(
            200,
            json={
                "steps": [
                    {
                        "type": "model_output",
                        "content": [{"type": "text", "text": json.dumps(ANALYST_JSON)}],
                    }
                ]
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    provider = GeminiAnalystClient("gemini-test-key", client=client)

    output, latency_ms = provider.analyze("demo prompt")

    assert output.recommended_action.value == "HUMAN_REVIEW"
    assert output.findings[0].evidence_refs == ["E1"]
    assert latency_ms >= 0
    assert captured["url"].endswith("/v1beta/interactions")
    assert captured["headers"]["x-goog-api-key"] == "gemini-test-key"
    assert captured["body"]["response_format"]["mime_type"] == "application/json"
    assert captured["body"]["response_format"]["schema"]["additionalProperties"] is False


def test_groq_uses_strict_json_schema_and_validates_response():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = json.loads(request.read().decode("utf-8"))
        return httpx.Response(
            200,
            json={
                "choices": [
                    {"message": {"content": json.dumps(REVIEWER_JSON)}}
                ]
            },
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    provider = GroqReviewerClient("groq-test-key", client=client)

    output, latency_ms = provider.review("review this")

    assert output.verdict == AIReviewerVerdict.CHALLENGE
    assert output.review_required is True
    assert latency_ms >= 0
    assert captured["body"]["model"] == "openai/gpt-oss-20b"
    assert captured["body"]["response_format"]["type"] == "json_schema"
    assert captured["body"]["response_format"]["json_schema"]["strict"] is True
    assert (
        captured["body"]["response_format"]["json_schema"]["schema"]["additionalProperties"]
        is False
    )
