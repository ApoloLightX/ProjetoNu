export type RiskBand = "LOW" | "MEDIUM" | "HIGH";

export type CounterpartyRiskInput = {
  company_name: string;
  sector: string;
  region: string;
  sector_environmental_exposure: number;
  geographic_environmental_exposure: number;
  climate_physical_exposure: number;
  climate_transition_exposure: number;
  social_signal_strength: number;
  environmental_event_strength: number;
  reputational_signal_strength: number;
  evidence_completeness: number;
};

export type RiskDimension = {
  score: number;
  band: RiskBand;
  drivers: string[];
};

export type SACAssessment = {
  company_name: string;
  inherent_risk: RiskDimension;
  observed_risk: RiskDimension;
  social_risk: RiskDimension;
  environmental_risk: RiskDimension;
  climate_physical_risk: RiskDimension;
  climate_transition_risk: RiskDimension;
  reputational_context_risk: RiskDimension;
  overall_score: number;
  overall_band: RiskBand;
  confidence: number;
  human_review_required: boolean;
  review_reasons: string[];
  methodology: string;
};

export type CompanyRegistryProfile = {
  cnpj: string;
  legal_name: string;
  trade_name: string | null;
  registration_status: string | null;
  primary_cnae_code: number | null;
  primary_cnae_description: string | null;
  municipality: string | null;
  state: string | null;
  postal_code: string | null;
  opened_at: string | null;
  company_size: string | null;
  legal_nature: string | null;
  source_name: string;
  source_url: string;
  source_is_official: boolean;
  risk_signal: boolean;
  disclaimer: string;
};

export type MLBaselinePrediction = {
  model_version: string;
  dataset_version: string;
  synthetic_dataset: true;
  predicted_material_risk_probability: number;
  elevated_at_demo_threshold: boolean;
  threshold: number;
  feature_values: Record<string, number>;
  disclaimer: string;
};

export type MLBaselineEvaluation = {
  model_version: string;
  dataset_version: string;
  synthetic_dataset: true;
  samples: number;
  test_samples: number;
  positive_rate: number;
  roc_auc: number;
  precision: number;
  recall: number;
  brier_score: number;
  threshold: number;
  excluded_from_features: string[];
  disclaimer: string;
};

export type EvidenceInput = {
  evidence_type: string;
  source_name: string;
  source_url?: string | null;
  observed_at?: string | null;
  payload: Record<string, unknown>;
  is_synthetic: boolean;
};

export type AIClaim = {
  finding: string;
  evidence_refs: string[];
  confidence: "LOW" | "MEDIUM" | "HIGH";
};

export type AIRiskAnalysis = {
  summary: string;
  findings: AIClaim[];
  uncertainty_flags: string[];
  recommended_action:
    | "NO_ADDITIONAL_ACTION"
    | "HUMAN_REVIEW"
    | "REQUEST_MORE_INFORMATION";
};

export type AIReviewerOutput = {
  verdict: "AGREE" | "CHALLENGE" | "INSUFFICIENT_EVIDENCE";
  unsupported_claims: string[];
  contradictions: string[];
  rationale: string;
  review_required: boolean;
};

export type AIProviderRun = {
  provider: string;
  model: string;
  role: string;
  prompt_version: string;
  input_hash: string;
  latency_ms: number;
};

export type AIAssessmentResponse = {
  status: "COMPLETE" | "DEGRADED";
  deterministic_assessment: SACAssessment;
  ml_prediction: MLBaselinePrediction;
  analyst: AIRiskAnalysis | null;
  reviewer: AIReviewerOutput | null;
  disagreement: boolean | null;
  decision_gate: "ASSISTIVE_OUTPUT_ONLY" | "HUMAN_REVIEW_REQUIRED" | "DETERMINISTIC_ONLY";
  degradation_reason: string | null;
  provider_runs: AIProviderRun[];
  trace_persistence: "NOT_REQUESTED" | "STORED" | "FAILED";
  trace_persistence_reason: string | null;
  disclaimer: string;
};

export type MicroReadinessStatus =
  | "INSUFFICIENT_HISTORY"
  | "NEEDS_MORE_EVIDENCE"
  | "EVIDENCE_READY_FOR_REVIEW";

export type MonthlyCashflowObservation = {
  period: string;
  inflows: number;
  outflows: number;
};

export type MicroReadinessRequest = {
  business_name: string;
  observations: MonthlyCashflowObservation[];
  largest_customer_share?: number | null;
  monthly_debt_service?: number | null;
  source_label?: string;
  is_synthetic: true;
};

export type MicroReadinessMetrics = {
  periods_observed: number;
  average_monthly_inflow: number;
  average_monthly_outflow: number;
  average_net_cashflow: number;
  positive_cashflow_month_ratio: number;
  inflow_coefficient_of_variation: number | null;
  largest_customer_share: number | null;
  debt_service_to_average_inflow: number | null;
};

export type MicroReadinessResponse = {
  business_name: string;
  status: MicroReadinessStatus;
  evidence_coverage: number;
  metrics: MicroReadinessMetrics;
  data_gaps: string[];
  explanations: string[];
  is_synthetic: true;
  credit_decision_produced: false;
  disclaimer: string;
};

export type AssessmentMode = "preview" | "live" | "error";
