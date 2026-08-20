import logging
import random
import re
import time
from collections.abc import Callable

import httpx

from .observability import log_event
from .registry_schemas import CompanyRegistryProfile

BRASIL_API_BASE_URL = "https://brasilapi.com.br/api/cnpj/v1"
DEFAULT_MAX_ATTEMPTS = 3
DEFAULT_BACKOFF_SECONDS = 0.2
MAX_BACKOFF_SECONDS = 1.0
RETRYABLE_STATUS_CODES = {408, 429, 500, 502, 503, 504}


class CompanyRegistryError(RuntimeError):
    pass


class CompanyRegistryNotFound(CompanyRegistryError):
    pass


def normalize_cnpj(value: str) -> str:
    digits = re.sub(r"\D", "", value)
    if len(digits) != 14 or len(set(digits)) == 1:
        raise ValueError("CNPJ must contain 14 valid-looking digits.")
    return digits


class BrasilApiCompanyRegistry:
    """Public company-registry enrichment.

    This connector is intentionally isolated from the SAC risk engine. Registry
    attributes identify the counterparty and its economic activity; they are not,
    by themselves, evidence of adverse social/environmental conduct.

    GET requests use a deliberately small retry budget because the lookup is
    idempotent. Validation/not-found responses are never retried.
    """

    def __init__(
        self,
        *,
        client: httpx.Client | None = None,
        max_attempts: int = DEFAULT_MAX_ATTEMPTS,
        sleep: Callable[[float], None] | None = None,
        jitter: Callable[[float, float], float] | None = None,
    ) -> None:
        if max_attempts < 1:
            raise ValueError("max_attempts must be at least 1.")

        self._owns_client = client is None
        self.client = client or httpx.Client(timeout=12.0)
        self.max_attempts = max_attempts
        self._sleep = sleep or time.sleep
        self._jitter = jitter or random.uniform

    def close(self) -> None:
        if self._owns_client:
            self.client.close()

    def fetch(self, cnpj: str) -> CompanyRegistryProfile:
        normalized = normalize_cnpj(cnpj)
        source_url = f"{BRASIL_API_BASE_URL}/{normalized}"
        response = self._request_with_retry(source_url)

        if response.status_code == 404:
            raise CompanyRegistryNotFound(
                f"CNPJ {normalized} was not found in the public registry source."
            )

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise CompanyRegistryError(
                f"Public company registry returned HTTP {response.status_code}."
            ) from exc

        try:
            payload = response.json()
        except ValueError as exc:
            raise CompanyRegistryError("Public registry returned invalid JSON.") from exc

        legal_name = str(payload.get("razao_social") or "").strip()
        if not legal_name:
            raise CompanyRegistryError("Public registry response did not contain a legal name.")

        return CompanyRegistryProfile(
            cnpj=normalized,
            legal_name=legal_name,
            trade_name=_clean(payload.get("nome_fantasia")),
            registration_status=_clean(payload.get("descricao_situacao_cadastral")),
            primary_cnae_code=_optional_int(payload.get("cnae_fiscal")),
            primary_cnae_description=_clean(payload.get("cnae_fiscal_descricao")),
            municipality=_clean(payload.get("municipio")),
            state=_clean(payload.get("uf")),
            postal_code=_clean(payload.get("cep")),
            opened_at=_clean(payload.get("data_inicio_atividade")),
            company_size=_clean(payload.get("porte")),
            legal_nature=_clean(payload.get("natureza_juridica")),
            source_name="BrasilAPI / Minha Receita",
            source_url=source_url,
            source_is_official=False,
            risk_signal=False,
            disclaimer=(
                "Registry enrichment only. These fields identify the company and economic activity; "
                "they do not constitute an adverse SAC finding or credit decision."
            ),
        )

    def _request_with_retry(self, source_url: str) -> httpx.Response:
        last_request_error: httpx.RequestError | None = None

        for attempt in range(1, self.max_attempts + 1):
            started = time.perf_counter()
            try:
                response = self.client.get(
                    source_url,
                    headers={
                        "Accept": "application/json",
                        "User-Agent": (
                            "ATLAS-SAC-Portfolio/1.0 "
                            "(+https://github.com/ApoloLightX/ProjetoNu)"
                        ),
                    },
                )
            except httpx.RequestError as exc:
                last_request_error = exc
                duration_ms = round((time.perf_counter() - started) * 1000, 2)
                retrying = attempt < self.max_attempts
                log_event(
                    "dependency_attempt_failed",
                    level=logging.WARNING,
                    dependency="brasilapi_cnpj",
                    operation="registry_lookup",
                    attempt=attempt,
                    max_attempts=self.max_attempts,
                    duration_ms=duration_ms,
                    error_type=type(exc).__name__,
                    retrying=retrying,
                )
                if not retrying:
                    break
                self._sleep(self._retry_delay(attempt))
                continue

            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            retrying = (
                response.status_code in RETRYABLE_STATUS_CODES and attempt < self.max_attempts
            )
            log_event(
                "dependency_attempt_completed",
                level=(
                    logging.WARNING
                    if response.status_code in RETRYABLE_STATUS_CODES
                    else logging.INFO
                ),
                dependency="brasilapi_cnpj",
                operation="registry_lookup",
                attempt=attempt,
                max_attempts=self.max_attempts,
                status_code=response.status_code,
                duration_ms=duration_ms,
                retrying=retrying,
            )

            if response.status_code not in RETRYABLE_STATUS_CODES:
                return response

            if attempt >= self.max_attempts:
                return response

            self._sleep(self._retry_delay(attempt))

        raise CompanyRegistryError("Public company registry is unavailable.") from last_request_error

    def _retry_delay(self, attempt: int) -> float:
        base = min(DEFAULT_BACKOFF_SECONDS * (2 ** (attempt - 1)), MAX_BACKOFF_SECONDS)
        return base + self._jitter(0.0, base * 0.25)


def _clean(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _optional_int(value: object) -> int | None:
    if value in (None, ""):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None
