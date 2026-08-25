import type {
  AIAssessmentResponse,
  CompanyRegistryProfile,
  CounterpartyRiskInput,
  EvidenceInput,
  MicroReadinessRequest,
  MicroReadinessResponse,
  MLBaselineEvaluation,
  MLBaselinePrediction,
  SACAssessment,
} from "./types";

const LOCAL_API_URL = "http://localhost:8000";
const VERIFIED_PRODUCTION_API_URL = "https://atlas-sac-web.vercel.app";
const STALE_PRODUCTION_API_ALIAS = "https://atlas-sac-api.vercel.app";

export function resolveApiUrl(
  configuredUrl: string | undefined = process.env.NEXT_PUBLIC_RISK_API_URL,
  nodeEnv: string | undefined = process.env.NODE_ENV,
): string {
  const configured = configuredUrl?.trim().replace(/\/+$/, "");

  if (!configured) {
    return nodeEnv === "production" ? VERIFIED_PRODUCTION_API_URL : LOCAL_API_URL;
  }

  if (configured === STALE_PRODUCTION_API_ALIAS) {
    return VERIFIED_PRODUCTION_API_URL;
  }

  return configured;
}

const API_URL = resolveApiUrl();

async function jsonOrThrow<T>(response: Response, context: string): Promise<T> {
  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ? `: ${payload.detail}` : "";
    } catch {
      detail = "";
    }
    throw new Error(`${context} returned HTTP ${response.status}${detail}`);
  }
  return (await response.json()) as T;
}

export async function lookupCompanyRegistry(cnpj: string): Promise<CompanyRegistryProfile> {
  const response = await fetch(`${API_URL}/v1/registry/cnpj/${encodeURIComponent(cnpj)}`, {
    method: "GET",
  });
  return jsonOrThrow<CompanyRegistryProfile>(response, "Company registry");
}

export async function runAssessment(input: CounterpartyRiskInput): Promise<SACAssessment> {
  const response = await fetch(`${API_URL}/v1/assessments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<SACAssessment>(response, "Risk engine");
}

export async function runMicroReadiness(
  input: MicroReadinessRequest,
): Promise<MicroReadinessResponse> {
  const response = await fetch(`${API_URL}/v1/micro/readiness`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOrThrow<MicroReadinessResponse>(response, "ATLAS Micro readiness");
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

export async function runAiAssessment(
  input: CounterpartyRiskInput,
  evidence: EvidenceInput[],
): Promise<AIAssessmentResponse> {
  const response = await fetch(`${API_URL}/v1/ai/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ counterparty: input, evidence }),
  });
  return jsonOrThrow<AIAssessmentResponse>(response, "AI review");
}

export function apiUrl(): string {
  return API_URL;
}
