import type { CounterpartyRiskInput, SACAssessment } from "./types";

export const DEMO_INPUT: CounterpartyRiskInput = {
  company_name: "Amazônia BioMadeira S.A. (fictícia)",
  sector: "Produtos florestais",
  region: "Pará, Brasil",
  sector_environmental_exposure: 0.82,
  geographic_environmental_exposure: 0.78,
  climate_physical_exposure: 0.74,
  climate_transition_exposure: 0.63,
  social_signal_strength: 0.52,
  environmental_event_strength: 0.86,
  reputational_signal_strength: 0.58,
  evidence_completeness: 0.56,
};

export const DEMO_ASSESSMENT: SACAssessment = {
  company_name: DEMO_INPUT.company_name,
  inherent_risk: {
    score: 0.758,
    band: "HIGH",
    drivers: [
      "sector exposure",
      "geographic exposure",
      "physical climate exposure",
      "transition exposure",
    ],
  },
  observed_risk: {
    score: 0.674,
    band: "HIGH",
    drivers: ["environmental events", "social signals", "reputational/context signals"],
  },
  social_risk: {
    score: 0.52,
    band: "MEDIUM",
    drivers: ["company-specific social signal strength"],
  },
  environmental_risk: {
    score: 0.828,
    band: "HIGH",
    drivers: [
      "sector environmental exposure",
      "geographic environmental exposure",
      "observed environmental event strength",
    ],
  },
  climate_physical_risk: {
    score: 0.74,
    band: "HIGH",
    drivers: ["geographic physical climate exposure"],
  },
  climate_transition_risk: {
    score: 0.63,
    band: "MEDIUM",
    drivers: ["sector transition exposure"],
  },
  reputational_context_risk: {
    score: 0.58,
    band: "MEDIUM",
    drivers: ["company-specific reputational/context signal strength"],
  },
  overall_score: 0.7118,
  overall_band: "HIGH",
  confidence: 0.56,
  human_review_required: true,
  review_reasons: [
    "high consolidated demo risk",
    "insufficient evidence completeness",
    "high company-specific observed signal",
    "high material SAC dimension",
  ],
  methodology:
    "ATLAS SAC v0 demo heuristic. Scores are transparent normalized features for portfolio demonstration only. They are not calibrated probabilities, credit scores or regulatory ratings.",
};
