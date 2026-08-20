import { describe, expect, it } from "vitest";

import { DEMO_ASSESSMENT, DEMO_INPUT } from "./demo";
import { buildEvidenceTraces } from "./evidence-trace";
import type { CompanyRegistryProfile } from "./types";

const registryProfile: CompanyRegistryProfile = {
  cnpj: "00000000000191",
  legal_name: "BANCO DO BRASIL SA",
  trade_name: "DIRECAO GERAL",
  registration_status: "ATIVA",
  primary_cnae_code: 6422100,
  primary_cnae_description: "Bancos múltiplos, com carteira comercial",
  municipality: "BRASILIA",
  state: "DF",
  postal_code: "70040912",
  opened_at: "1966-08-01",
  company_size: "DEMAIS",
  legal_nature: "Sociedade de Economia Mista",
  source_name: "BrasilAPI / Minha Receita",
  source_url: "https://brasilapi.com.br/api/cnpj/v1/00000000000191",
  source_is_official: false,
  risk_signal: false,
  disclaimer: "Registry enrichment only.",
};

describe("evidence trace builder", () => {
  it("keeps public registry context out of observed-risk evidence", () => {
    const traces = buildEvidenceTraces({
      assessment: DEMO_ASSESSMENT,
      input: DEMO_INPUT,
      registryProfile,
    });

    const observed = traces.find((trace) => trace.id === "observed");
    expect(observed).toBeDefined();
    expect(observed?.nodes.some((node) => node.kind === "source")).toBe(false);
    expect(observed?.nodes.at(-1)?.detail).toContain("não são convertidos em evento adverso observado");
  });

  it("preserves registry provenance in contextual traces", () => {
    const traces = buildEvidenceTraces({
      assessment: DEMO_ASSESSMENT,
      input: DEMO_INPUT,
      registryProfile,
    });

    const inherent = traces.find((trace) => trace.id === "inherent");
    const source = inherent?.nodes.find((node) => node.kind === "source");

    expect(source?.label).toBe("BrasilAPI / Minha Receita");
    expect(source?.sourceUrl).toContain("/00000000000191");
    expect(source?.detail).toContain("risk_signal=false");
  });

  it("makes missing evidence visible instead of lowering the risk result", () => {
    const traces = buildEvidenceTraces({
      assessment: DEMO_ASSESSMENT,
      input: { ...DEMO_INPUT, evidence_completeness: 0.56 },
      registryProfile: null,
    });

    const uncertainty = traces.find((trace) => trace.id === "uncertainty");
    expect(uncertainty?.nodes.find((node) => node.kind === "unknown")?.label).toBe(
      "Lacuna informacional 44%",
    );
    expect(uncertainty?.nodes.at(-1)?.label).toBe("Ausência de evidência ≠ baixo risco");
  });
});
