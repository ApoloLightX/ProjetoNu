import { describe, expect, it } from "vitest";

import { resolveApiUrl } from "./api";

describe("ATLAS API URL resolution", () => {
  it("maps the stale production alias to the verified public risk-engine domain", () => {
    expect(resolveApiUrl("https://atlas-sac-api.vercel.app", "production")).toBe(
      "https://atlas-sac-web.vercel.app",
    );
  });

  it("uses the verified public risk-engine domain when production has no explicit URL", () => {
    expect(resolveApiUrl(undefined, "production")).toBe("https://atlas-sac-web.vercel.app");
  });

  it("keeps local development on localhost when no URL is configured", () => {
    expect(resolveApiUrl(undefined, "development")).toBe("http://localhost:8000");
  });

  it("normalizes a configured API URL without overriding a valid custom endpoint", () => {
    expect(resolveApiUrl(" https://risk.example.com/ ", "production")).toBe(
      "https://risk.example.com",
    );
  });
});
