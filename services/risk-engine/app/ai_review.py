import json
from typing import Protocol

from .ai_providers import (
    AIProviderError,
    AIProviderNotConfigured,
    GeminiAnalystClient,
    GroqReviewerClient,
)
from .ml_baseline import predict_baseline
from .risk_engine import assess_counterparty
from .schemas import (
    AIAnalystAction,
    AIAssessmentRequest,
    AIAssessmentResponse,
    AIClaim,
    AIConfidence,
    AIDecisionGate,
    AIProviderRun,
    AIRiskAnalysis,
    AIReviewerOutput,
    AIReviewerVerdict,
    AIReviewStatus,
)

AI_DISCLAIMER = (
    "LLM output is assistive commentary over supplied structured evidence. It does not change "
    "the deterministic score, synthetic ML probability or human-review ownership."
)


class AnalystClient(Protocol):
    provider: str
    role: str
    model: str

    def analyze(self, prompt: str) -> tuple[AIRiskAnalysis, int]: ...

    def close(self) -> None: ...


class ReviewerClient(Protocol):
    provider: str
    role: str
    model: str

    def review(self, prompt: str) -> tuple[AIReviewerOutput, int]: ...

    def close(self) -> None: ...


def _evidence_context(request: AIAssessmentRequest) -> tuple[list[dict], set[str]]:
    records: list[dict] = []
    allowed_refs = {
        "DET:inherent_risk",
        "DET:observed_risk",
        "DET:environmental_risk",
        "DET:social_risk",
        "DET:climate_physical_risk",
        "DET:climate_transition_risk",
        "DET:reputational_context_risk",
        "ML:synthetic_baseline",
    }

    for index, item in enumerate(request.evidence, start=1):
        ref = f"E{index}"
        allowed_refs.add(ref)
        records.append(
            {
                "ref": ref,
                "evidence_type": item.evidence_type,
                "source_name": item.source_name,
                "source_url": item.source_url,
                "observed_at": item.observed_at.isoformat() if item.observed_at else None,
                "payload": item.payload,
                "is_synthetic": item.is_synthetic,
            }
        )

    return records, allowed_refs


def _validate_analyst_references(analysis: AIRiskAnalysis, allowed_refs: set[str]) -> None:
    unknown = sorted(
        {
            ref
            for finding in analysis.findings
            for ref in finding.evidence_refs
            if ref not in allowed_refs
        }
    )
    if unknown:
        raise AIProviderError(
            "Analyst cited evidence references that were not supplied: " + ", ".join(unknown)
        )


def _analyst_prompt(request: AIAssessmentRequest) -> tuple[str, set[str]]:
    assessment = assess_counterparty(request.counterparty)
    ml_prediction = predict_baseline(request.counterparty)
    evidence, allowed_refs = _evidence_context(request)

    context = {
        "counterparty": {
            "company_name": request.counterparty.company_name,
            "sector": request.counterparty.sector,
            "region": request.counterparty.region,
        },
        "deterministic_assessment": assessment.model_dump(mode="json"),
        "synthetic_ml_baseline": ml_prediction.model_dump(mode="json"),
        "evidence": evidence,
        "allowed_evidence_refs": sorted(allowed_refs),
    }

    prompt = (
        "ATLAS SAC research workflow. Analyze ONLY the JSON context below. "
        "Do not make a credit decision, do not claim regulatory compliance, and do not invent "
        "facts about the counterparty. Distinguish inherent sector/geographic exposure from "
        "company-specific observed evidence. Every finding must cite one or more exact values "
        "from allowed_evidence_refs. If evidence is missing, state uncertainty and request more "
        "information rather than treating missing evidence as low risk. The ML result is trained "
        "on synthetic data and may only be described as an experimental signal.\n\nCONTEXT:\n"
        + json.dumps(context, ensure_ascii=False, separators=(",", ":"))
    )
    return prompt, allowed_refs


def _reviewer_prompt(
    request: AIAssessmentRequest,
    analyst: AIRiskAnalysis,
) -> str:
    assessment = assess_counterparty(request.counterparty)
    ml_prediction = predict_baseline(request.counterparty)
    evidence, allowed_refs = _evidence_context(request)

    context = {
        "deterministic_assessment": assessment.model_dump(mode="json"),
        "synthetic_ml_baseline": ml_prediction.model_dump(mode="json"),
        "evidence": evidence,
        "allowed_evidence_refs": sorted(allowed_refs),
        "analyst_output": analyst.model_dump(mode="json"),
    }

    return (
        "Independently review the analyst output against ONLY the supplied context. Challenge any "
        "unsupported causal claim, any confusion between inherent exposure and observed company "
        "behavior, any statement that treats missing evidence as safety, and any misuse of the "
        "synthetic ML probability as real-world performance. Set review_required=true whenever "
        "material uncertainty, unsupported claims or contradictions remain. Do not make a credit "
        "decision.\n\nCONTEXT:\n"
        + json.dumps(context, ensure_ascii=False, separators=(",", ":"))
    )


def _degraded_response(
    request: AIAssessmentRequest,
    reason: str,
    provider_runs: list[AIProviderRun],
) -> AIAssessmentResponse:
    assessment = assess_counterparty(request.counterparty)
    gate = (
        AIDecisionGate.HUMAN_REVIEW_REQUIRED
        if assessment.human_review_required
        else AIDecisionGate.DETERMINISTIC_ONLY
    )
    return AIAssessmentResponse(
        status=AIReviewStatus.DEGRADED,
        deterministic_assessment=assessment,
        ml_prediction=predict_baseline(request.counterparty),
        analyst=None,
        reviewer=None,
        disagreement=None,
        decision_gate=gate,
        degradation_reason=reason,
        provider_runs=provider_runs,
        disclaimer=AI_DISCLAIMER,
    )


def run_ai_assessment(
    request: AIAssessmentRequest,
    *,
    analyst_client: AnalystClient | None = None,
    reviewer_client: ReviewerClient | None = None,
) -> AIAssessmentResponse:
    assessment = assess_counterparty(request.counterparty)
    ml_prediction = predict_baseline(request.counterparty)
    provider_runs: list[AIProviderRun] = []
    created_analyst = analyst_client is None
    created_reviewer = reviewer_client is None

    try:
        if analyst_client is None:
            analyst_client = GeminiAnalystClient.from_env()
        if reviewer_client is None:
            reviewer_client = GroqReviewerClient.from_env()

        analyst_prompt, allowed_refs = _analyst_prompt(request)
        analyst, analyst_latency = analyst_client.analyze(analyst_prompt)
        _validate_analyst_references(analyst, allowed_refs)
        provider_runs.append(
            AIProviderRun(
                provider=analyst_client.provider,
                model=analyst_client.model,
                role=analyst_client.role,
                latency_ms=analyst_latency,
            )
        )

        reviewer, reviewer_latency = reviewer_client.review(_reviewer_prompt(request, analyst))
        provider_runs.append(
            AIProviderRun(
                provider=reviewer_client.provider,
                model=reviewer_client.model,
                role=reviewer_client.role,
                latency_ms=reviewer_latency,
            )
        )
    except (AIProviderNotConfigured, AIProviderError) as exc:
        return _degraded_response(request, str(exc), provider_runs)
    finally:
        if created_analyst and analyst_client is not None:
            analyst_client.close()
        if created_reviewer and reviewer_client is not None:
            reviewer_client.close()

    disagreement = reviewer.verdict != AIReviewerVerdict.AGREE
    ai_requests_review = (
        analyst.recommended_action != AIAnalystAction.NO_ADDITIONAL_ACTION
        or reviewer.review_required
        or disagreement
    )
    gate = (
        AIDecisionGate.HUMAN_REVIEW_REQUIRED
        if assessment.human_review_required or ai_requests_review
        else AIDecisionGate.ASSISTIVE_OUTPUT_ONLY
    )

    return AIAssessmentResponse(
        status=AIReviewStatus.COMPLETE,
        deterministic_assessment=assessment,
        ml_prediction=ml_prediction,
        analyst=analyst,
        reviewer=reviewer,
        disagreement=disagreement,
        decision_gate=gate,
        degradation_reason=None,
        provider_runs=provider_runs,
        disclaimer=AI_DISCLAIMER,
    )


def safe_empty_analysis() -> AIRiskAnalysis:
    """Utility for tests/examples; not used as a production fallback."""
    return AIRiskAnalysis(
        summary="No additional AI finding.",
        findings=[
            AIClaim(
                finding="No claim beyond the deterministic assessment.",
                evidence_refs=["DET:inherent_risk"],
                confidence=AIConfidence.LOW,
            )
        ],
        uncertainty_flags=["AI output unavailable"],
        recommended_action=AIAnalystAction.HUMAN_REVIEW,
    )
