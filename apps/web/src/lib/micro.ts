import type { MicroReadinessResponse, MicroReadinessStatus } from "./micro-types";

export type MicroEvidenceState = "verified" | "partial" | "unknown";

export type MicroEvidenceItem = {
  label: string;
  detail: string;
  state: MicroEvidenceState;
};

export function formatBrl(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function readinessLabel(status: MicroReadinessStatus): string {
  switch (status) {
    case "EVIDENCE_READY_FOR_REVIEW":
      return "Pronto para revisão de evidências";
    case "NEEDS_MORE_EVIDENCE":
      return "Mais evidências necessárias";
    case "INSUFFICIENT_HISTORY":
      return "Histórico ainda insuficiente";
  }
}

export function readinessDescription(status: MicroReadinessStatus): string {
  switch (status) {
    case "EVIDENCE_READY_FOR_REVIEW":
      return "O pacote sintético possui cobertura suficiente para uma revisão humana. Isso não representa aprovação de crédito.";
    case "NEEDS_MORE_EVIDENCE":
      return "O histórico mínimo existe, mas ainda há lacunas que precisam ser preenchidas antes de uma revisão mais completa.";
    case "INSUFFICIENT_HISTORY":
      return "Ainda não há histórico mensal suficiente para caracterizar o pacote de evidências com a mesma profundidade.";
  }
}

export function buildEvidenceItems(response: MicroReadinessResponse): MicroEvidenceItem[] {
  const historyComplete = response.metrics.periods_observed >= 6;
  const hasCustomerConcentration = response.metrics.largest_customer_share !== null;
  const hasDebtService = response.metrics.debt_service_to_average_inflow !== null;

  return [
    {
      label: "Histórico de fluxo de caixa",
      detail: `${response.metrics.periods_observed} meses observados`,
      state: historyComplete ? "verified" : "partial",
    },
    {
      label: "Concentração de clientes",
      detail: hasCustomerConcentration
        ? `${formatPercent(response.metrics.largest_customer_share ?? 0)} no maior cliente`
        : "Informação não fornecida",
      state: hasCustomerConcentration ? "verified" : "unknown",
    },
    {
      label: "Serviço mensal da dívida",
      detail: hasDebtService
        ? `${formatPercent(response.metrics.debt_service_to_average_inflow ?? 0, 1)} da entrada média`
        : "Informação não fornecida",
      state: hasDebtService ? "verified" : "unknown",
    },
  ];
}
