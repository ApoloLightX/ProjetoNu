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
  largest_customer_share: number | null;
  monthly_debt_service: number | null;
  source_label: string;
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
