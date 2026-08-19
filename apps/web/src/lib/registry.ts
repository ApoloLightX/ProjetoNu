import type { CompanyRegistryProfile, EvidenceInput } from "./types";

export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, "").slice(0, 14);
}

export function formatCnpj(value: string): string {
  const digits = normalizeCnpj(value);
  if (digits.length !== 14) return digits;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function registryProfileToContext(profile: CompanyRegistryProfile): {
  company_name: string;
  sector: string;
  region: string;
} {
  const sector = profile.primary_cnae_description
    ? profile.primary_cnae_code
      ? `${profile.primary_cnae_description} · CNAE ${profile.primary_cnae_code}`
      : profile.primary_cnae_description
    : "Setor não informado pelo cadastro";

  const location = [profile.municipality, profile.state].filter(Boolean).join(", ");

  return {
    company_name: profile.legal_name,
    sector,
    region: location || "Localização não informada pelo cadastro",
  };
}

export function registryProfileToEvidence(profile: CompanyRegistryProfile): EvidenceInput {
  return {
    evidence_type: "public_company_registry_context",
    source_name: profile.source_name,
    source_url: profile.source_url,
    observed_at: null,
    payload: {
      cnpj: profile.cnpj,
      legal_name: profile.legal_name,
      trade_name: profile.trade_name,
      registration_status: profile.registration_status,
      primary_cnae_code: profile.primary_cnae_code,
      primary_cnae_description: profile.primary_cnae_description,
      municipality: profile.municipality,
      state: profile.state,
      company_size: profile.company_size,
      legal_nature: profile.legal_nature,
      source_is_official: profile.source_is_official,
      risk_signal: profile.risk_signal,
      boundary: "Registry identity/context only. This evidence is not an adverse SAC finding.",
    },
    is_synthetic: false,
  };
}
