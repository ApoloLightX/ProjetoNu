import { describe, expect, it } from "vitest";

import { DEMO_ASSESSMENT } from "./demo";
import { dimensionsOf, toPercent } from "./risk";

describe("risk presentation helpers", () => {
  it("clamps and converts normalized scores to percentages", () => {
    expect(toPercent(0.7118)).toBe(71);
    expect(toPercent(-1)).toBe(0);
    expect(toPercent(4)).toBe(100);
  });

  it("exposes all five material SAC dimensions", () => {
    const dimensions = dimensionsOf(DEMO_ASSESSMENT);
    expect(dimensions).toHaveLength(5);
    expect(dimensions.map((item) => item.key)).toEqual([
      "environmental",
      "social",
      "physical",
      "transition",
      "reputational",
    ]);
  });
});
