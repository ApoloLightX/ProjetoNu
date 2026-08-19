import { describe, expect, it } from "vitest";

import {
  formatCnpj,
  normalizeCnpj,
  registryProfileToContext,
  registryProfileToEvidence,
} from "./registry";
import type { CompanyRegistryProfile } from "./types";

const PROFILE: CompanyRegistryProfile = {
  cnpj: "19131243000197",
  legal_name: "Empresa Exemplo S.A.",
  trade_name: "Empresa Exemplo",
  registration_status: "ATIVA",
  primary_cnae_code: 6201501,
  primary_cnae_description: "Desenvolvimento de programas de computador sob encomenda",
  municipality: "São Paulo",
  state: "SP",
  postal_code: "01001000",
  opened_at: "2014-01-01",
  company_size: "DEMAIS",
  legal_nature: "Sociedade Empresária Limitada",
  source_name: "BrasilAPI / CNPJ",
  source_url: "https://brasilapi.com.br/api/cnpj/v1/19131243000197",
  source_is_official: false,
  risk_signal: false,
  disclaimer: "Registry context only.",
};

describe("company registry helpers", () => {
  it("normalizes and formats CNPJ input", () => {
    expect(normalizeCnpj("19.131.243/0001-97")).toBe("19131243000197");
    expect(formatCnpj("19131243000197")).toBe("19.131.243/0001-97");
  });

  it("maps registry identity into counterparty context without inventing risk", () => {
    expect(registryProfileToContext(PROFILE)).toEqual({
      company_name: "Empresa Exemplo S.A.",
      sector:
        "Desenvolvimento de programas de computador sob encomenda · CNAE 6201501",
      region: "São Paulo, SP",
    });
  });

  it("preserves the provenance boundary in AI evidence", () => {
    const evidence = registryProfileToEvidence(PROFILE);
    expect(evidence.is_synthetic).toBe(false);
    expect(evidence.source_url).toBe(PROFILE.source_url);
    expect(evidence.payload.risk_signal).toBe(false);
    expect(evidence.payload.boundary).toContain("not an adverse SAC finding");
  });
});
