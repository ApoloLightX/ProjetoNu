import re

import httpx

from .registry_schemas import CompanyRegistryProfile

BRASIL_API_BASE_URL = "https://brasilapi.com.br/api/cnpj/v1"


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
    """

    def __init__(self, *, client: httpx.Client | None = None) -> None:
        self._owns_client = client is None
        self.client = client or httpx.Client(timeout=12.0)

    def close(self) -> None:
        if self._owns_client:
            self.client.close()

    def fetch(self, cnpj: str) -> CompanyRegistryProfile:
        normalized = normalize_cnpj(cnpj)
        source_url = f"{BRASIL_API_BASE_URL}/{normalized}"

        try:
            response = self.client.get(
                source_url,
                headers={
                    "Accept": "application/json",
                    "User-Agent": "ATLAS-SAC-Portfolio/1.0 (+https://github.com/ApoloLightX/ProjetoNu)",
                },
            )
        except httpx.RequestError as exc:
            raise CompanyRegistryError("Public company registry is unavailable.") from exc

        if response.status_code == 404:
            raise CompanyRegistryNotFound(f"CNPJ {normalized} was not found in the public registry source.")

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise CompanyRegistryError(
                f"Public company registry returned HTTP {response.status_code}."
            ) from exc

        payload = response.json()
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
