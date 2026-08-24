import hashlib
import os
from uuid import UUID

import httpx

from .schemas import (
    AIProviderRun,
    HumanReviewRequest,
    PersistAssessmentRequest,
    ReplayAssessmentResponse,
    SACAssessment,
)


class PersistenceNotConfigured(RuntimeError):
    pass


class PersistenceNotFound(RuntimeError):
    pass


class PersistenceError(RuntimeError):
    pass


def stable_external_ref(request: PersistAssessmentRequest) -> str:
    if request.external_ref:
        return request.external_ref

    identity = "|".join(
        [
            request.counterparty.company_name.strip().lower(),
            request.counterparty.sector.strip().lower(),
            request.counterparty.region.strip().lower(),
        ]
    )
    digest = hashlib.sha256(identity.encode("utf-8")).hexdigest()[:24]
    return f"synthetic:{digest}"


class SupabaseRestRepository:
    def __init__(
        self,
        base_url: str,
        service_role_key: str,
        *,
        client: httpx.Client | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.service_role_key = service_role_key
        self._owns_client = client is None
        self.client = client or httpx.Client(timeout=12.0)

    @classmethod
    def from_env(cls) -> "SupabaseRestRepository":
        base_url = os.environ.get("SUPABASE_URL", "").strip()
        service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        if not base_url or not service_role_key:
            raise PersistenceNotConfigured(
                "Supabase persistence is not configured on the risk-engine server."
            )
        return cls(base_url, service_role_key)

    @property
    def headers(self) -> dict[str, str]:
        return {
            "apikey": self.service_role_key,
            "Authorization": f"Bearer {self.service_role_key}",
            "Content-Type": "application/json",
        }

    def close(self) -> None:
        if self._owns_client:
            self.client.close()

    def healthcheck(self) -> None:
        """Touch PostgREST so readiness reflects the real database dependency."""
        try:
            response = self.client.get(
                f"{self.base_url}/rest/v1/assessment_runs",
                headers=self.headers,
                params={"select": "id", "limit": "1"},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise PersistenceError(
                f"Supabase healthcheck failed with HTTP {exc.response.status_code}."
            ) from exc
        except httpx.RequestError as exc:
            raise PersistenceError("Supabase healthcheck is unavailable.") from exc

    def _rpc(self, function_name: str, payload: dict) -> object:
        try:
            response = self.client.post(
                f"{self.base_url}/rest/v1/rpc/{function_name}",
                headers=self.headers,
                json=payload,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise PersistenceError(
                f"Supabase RPC {function_name} failed with HTTP {exc.response.status_code}."
            ) from exc
        except httpx.RequestError as exc:
            raise PersistenceError(f"Supabase RPC {function_name} is unavailable.") from exc

        return response.json()

    def persist_assessment(
        self,
        request: PersistAssessmentRequest,
        assessment: SACAssessment,
        methodology_version: str,
    ) -> UUID:
        run_id = self._rpc(
            "persist_assessment_snapshot",
            {
                "p_external_ref": stable_external_ref(request),
                "p_company_name": request.counterparty.company_name,
                "p_sector": request.counterparty.sector,
                "p_region": request.counterparty.region,
                "p_is_synthetic": request.is_synthetic,
                "p_evidence": [item.model_dump(mode="json") for item in request.evidence],
                "p_methodology_version": methodology_version,
                "p_input_snapshot": request.counterparty.model_dump(mode="json"),
                "p_result_snapshot": assessment.model_dump(mode="json"),
                "p_overall_score": assessment.overall_score,
                "p_overall_band": assessment.overall_band.value,
                "p_confidence": assessment.confidence,
                "p_human_review_required": assessment.human_review_required,
            },
        )
        return UUID(str(run_id))

    def fetch_assessment(self, run_id: UUID) -> ReplayAssessmentResponse:
        try:
            response = self.client.get(
                f"{self.base_url}/rest/v1/assessment_runs",
                headers=self.headers,
                params={
                    "id": f"eq.{run_id}",
                    "select": (
                        "id,counterparty_id,methodology_version,input_snapshot,"
                        "result_snapshot,created_at"
                    ),
                    "limit": "1",
                },
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise PersistenceError(
                f"Supabase replay lookup failed with HTTP {exc.response.status_code}."
            ) from exc
        except httpx.RequestError as exc:
            raise PersistenceError("Supabase replay lookup is unavailable.") from exc

        rows = response.json()
        if not rows:
            raise PersistenceNotFound(f"Assessment run {run_id} was not found.")

        row = rows[0]
        return ReplayAssessmentResponse(
            run_id=row["id"],
            counterparty_id=row["counterparty_id"],
            methodology_version=row["methodology_version"],
            input_snapshot=row["input_snapshot"],
            assessment=SACAssessment.model_validate(row["result_snapshot"]),
            created_at=row["created_at"],
        )

    def record_human_review(self, run_id: UUID, review: HumanReviewRequest) -> UUID:
        review_id = self._rpc(
            "record_human_review",
            {
                "p_assessment_run_id": str(run_id),
                "p_reviewer_ref": review.reviewer_ref,
                "p_decision": review.decision.value,
                "p_rationale": review.rationale,
            },
        )
        return UUID(str(review_id))

    def record_ai_run(
        self,
        assessment_run_id: UUID,
        provider_run: AIProviderRun,
        structured_output: dict,
    ) -> UUID:
        ai_run_id = self._rpc(
            "record_ai_run_trace",
            {
                "p_assessment_run_id": str(assessment_run_id),
                "p_provider": provider_run.provider,
                "p_model": provider_run.model,
                "p_role": provider_run.role,
                "p_prompt_version": provider_run.prompt_version,
                "p_input_hash": provider_run.input_hash,
                "p_structured_output": structured_output,
                "p_latency_ms": provider_run.latency_ms,
            },
        )
        return UUID(str(ai_run_id))