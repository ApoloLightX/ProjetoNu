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

export type AssessmentMode = "preview" | "live" | "error";
