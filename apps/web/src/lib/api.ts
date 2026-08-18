import type { CounterpartyRiskInput, SACAssessment } from "./types";

const API_URL = process.env.NEXT_PUBLIC_RISK_API_URL ?? "http://localhost:8000";

export async function runAssessment(input: CounterpartyRiskInput): Promise<SACAssessment> {
  const response = await fetch(`${API_URL}/v1/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Risk engine returned HTTP ${response.status}`);
  }

  return (await response.json()) as SACAssessment;
}

export function apiUrl(): string {
  return API_URL;
}
