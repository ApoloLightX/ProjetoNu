import type {
  CounterpartyRiskInput,
  MLBaselineEvaluation,
  MLBaselinePrediction,
  SACAssessment,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_RISK_API_URL ?? "http://localhost:8000";

async function jsonOrThrow<T>(response: Response, context: string): Promise<T> {
  if (!response.ok) {
    throw new Error(`${context} returned HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function runAssessment(input: CounterpartyRiskInput): Promise<SACAssessment> {
  const response = await fetch(`${API_URL}/v1/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<SACAssessment>(response, "Risk engine");
}

export async function runMlPrediction(
  input: CounterpartyRiskInput,
): Promise<MLBaselinePrediction> {
  const response = await fetch(`${API_URL}/v1/ml/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<MLBaselinePrediction>(response, "ML baseline");
}

export async function loadMlEvaluation(): Promise<MLBaselineEvaluation> {
  const response = await fetch(`${API_URL}/v1/ml/evaluation`, { method: "GET" });
  return jsonOrThrow<MLBaselineEvaluation>(response, "ML evaluation");
}

export function apiUrl(): string {
  return API_URL;
}
