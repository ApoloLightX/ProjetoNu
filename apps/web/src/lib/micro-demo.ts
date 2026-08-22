import type { MicroReadinessRequest, MicroReadinessResponse } from "./types";

const baseObservations = [
  { period: "2026-01", inflows: 11200, outflows: 8100 },
  { period: "2026-02", inflows: 11850, outflows: 8300 },
  { period: "2026-03", inflows: 11600, outflows: 8200 },
  { period: "2026-04", inflows: 12100, outflows: 8450 },
  { period: "2026-05", inflows: 12050, outflows: 8500 },
  { period: "2026-06", inflows: 11900, outflows: 8420 },
] as const;

export type MicroDemoKey = "complete" | "gaps" | "short";

export const MICRO_DEMO_REQUESTS: Record<MicroDemoKey, MicroReadinessRequest> = {
  complete: {
    business_name: "Padaria Horizonte",
    observations: [...baseObservations],
    largest_customer_share: 0.24,
    monthly_debt_service: 900,
    source_label: "synthetic_demo_complete",
    is_synthetic: true,
  },
  gaps: {
    business_name: "Padaria Horizonte",
    observations: [...baseObservations],
    largest_customer_share: null,
    monthly_debt_service: null,
    source_label: "synthetic_demo_gaps",
    is_synthetic: true,
  },
  short: {
    business_name: "Padaria Horizonte",
    observations: baseObservations.slice(0, 3),
    largest_customer_share: 0.24,
    monthly_debt_service: 900,
    source_label: "synthetic_demo_short_history",
    is_synthetic: true,
  },
};

const completeMetrics = {
  periods_observed: 6,
  average_monthly_inflow: 11783.33,
  average_monthly_outflow: 8328.33,
  average_net_cashflow: 3455,
  positive_cashflow_month_ratio: 1,
  inflow_coefficient_of_variation: 0.026,
  largest_customer_share: 0.24,
  debt_service_to_average_inflow: 0.0764,
};

const explanations = [
  "Cobertura de evidências mede quanto do pacote de demonstração está disponível; não é um score de risco de crédito.",
  "Informação ausente cria uma lacuna explícita e não se transforma em evidência adversa.",
  "As métricas de fluxo de caixa descrevem apenas observações sintéticas e não produzem aprovação, negação, preço ou limite de crédito.",
];

export const MICRO_DEMO_FALLBACKS: Record<MicroDemoKey, MicroReadinessResponse> = {
  complete: {
    business_name: "Padaria Horizonte",
    status: "EVIDENCE_READY_FOR_REVIEW",
    evidence_coverage: 1,
    metrics: completeMetrics,
    data_gaps: [],
    explanations,
    is_synthetic: true,
    credit_decision_produced: false,
    disclaimer: "Fixture visual sintética do ATLAS Micro. Nenhuma decisão de crédito foi produzida.",
  },
  gaps: {
    business_name: "Padaria Horizonte",
    status: "NEEDS_MORE_EVIDENCE",
    evidence_coverage: 0.5,
    metrics: {
      ...completeMetrics,
      largest_customer_share: null,
      debt_service_to_average_inflow: null,
    },
    data_gaps: [
      "Concentração de clientes desconhecida.",
      "Comprometimento mensal atual com dívida desconhecido.",
    ],
    explanations,
    is_synthetic: true,
    credit_decision_produced: false,
    disclaimer: "Fixture visual sintética do ATLAS Micro. Lacunas não são tratadas como evidência negativa.",
  },
  short: {
    business_name: "Padaria Horizonte",
    status: "INSUFFICIENT_HISTORY",
    evidence_coverage: 0.75,
    metrics: {
      periods_observed: 3,
      average_monthly_inflow: 11550,
      average_monthly_outflow: 8200,
      average_net_cashflow: 3350,
      positive_cashflow_month_ratio: 1,
      inflow_coefficient_of_variation: 0.023,
      largest_customer_share: 0.24,
      debt_service_to_average_inflow: 0.0779,
    },
    data_gaps: ["Menos de seis períodos mensais de fluxo de caixa estão disponíveis."],
    explanations,
    is_synthetic: true,
    credit_decision_produced: false,
    disclaimer: "Fixture visual sintética do ATLAS Micro. Histórico curto reduz a prontidão da evidência, não cria risco adverso.",
  },
};
