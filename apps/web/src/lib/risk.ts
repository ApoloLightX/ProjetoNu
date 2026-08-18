import type { RiskBand, RiskDimension, SACAssessment } from "./types";

export const bandLabel: Record<RiskBand, string> = {
  LOW: "Baixo",
  MEDIUM: "Médio",
  HIGH: "Alto",
};

export function toPercent(value: number): number {
  return Math.round(Math.max(0, Math.min(1, value)) * 100);
}

export function dimensionsOf(assessment: SACAssessment): Array<{
  key: string;
  label: string;
  dimension: RiskDimension;
}> {
  return [
    { key: "environmental", label: "Ambiental", dimension: assessment.environmental_risk },
    { key: "social", label: "Social", dimension: assessment.social_risk },
    { key: "physical", label: "Climático físico", dimension: assessment.climate_physical_risk },
    { key: "transition", label: "Climático de transição", dimension: assessment.climate_transition_risk },
    { key: "reputational", label: "Reputacional / contexto", dimension: assessment.reputational_context_risk },
  ];
}
