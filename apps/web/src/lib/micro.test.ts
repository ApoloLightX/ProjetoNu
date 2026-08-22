import { describe, expect, it } from "vitest";

import { MICRO_DEMO_FALLBACKS } from "./micro-demo";
import { buildEvidenceItems, readinessLabel } from "./micro";

describe("ATLAS Micro presentation rules", () => {
  it("keeps missing evidence as unknown rather than adverse", () => {
    const items = buildEvidenceItems(MICRO_DEMO_FALLBACKS.gaps);

    expect(items.filter((item) => item.state === "unknown")).toHaveLength(2);
    expect(items.some((item) => item.detail.toLowerCase().includes("negativ"))).toBe(false);
  });

  it("labels a complete evidence packet as ready for human review", () => {
    expect(readinessLabel(MICRO_DEMO_FALLBACKS.complete.status)).toBe(
      "Pronto para revisão de evidências",
    );
    expect(MICRO_DEMO_FALLBACKS.complete.credit_decision_produced).toBe(false);
  });

  it("keeps short history distinct from credit risk", () => {
    const response = MICRO_DEMO_FALLBACKS.short;

    expect(response.status).toBe("INSUFFICIENT_HISTORY");
    expect(response.credit_decision_produced).toBe(false);
  });
});
