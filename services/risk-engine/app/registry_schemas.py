from pydantic import BaseModel, Field


class CompanyRegistryProfile(BaseModel):
    cnpj: str = Field(pattern=r"^\d{14}$")
    legal_name: str
    trade_name: str | None = None
    registration_status: str | None = None
    primary_cnae_code: int | None = None
    primary_cnae_description: str | None = None
    municipality: str | None = None
    state: str | None = None
    postal_code: str | None = None
    opened_at: str | None = None
    company_size: str | None = None
    legal_nature: str | None = None
    source_name: str
    source_url: str
    source_is_official: bool = False
    risk_signal: bool = False
    disclaimer: str
