import { bandLabel, toPercent } from "./risk";
import type {
  CompanyRegistryProfile,
  CounterpartyRiskInput,
  RiskDimension,
  SACAssessment,
} from "./types";

export type EvidenceTraceNodeKind =
  | "conclusion"
  | "signal"
  | "context"
  | "source"
  | "unknown"
  | "boundary";

export type EvidenceTraceNode = {
  id: string;
  label: string;
  detail: string;
  kind: EvidenceTraceNodeKind;
  sourceUrl?: string;
};

export type EvidenceTrace = {
  id: string;
  title: string;
  summary: string;
  nodes: EvidenceTraceNode[];
};

type BuildEvidenceTracesArgs = {
  assessment: SACAssessment;
  input: CounterpartyRiskInput;
  registryProfile: CompanyRegistryProfile | null;
};

const scoreLabel = (dimension: RiskDimension) =>
  `${toPercent(dimension.score)} · ${bandLabel[dimension.band]}`;

function registryContextNodes(profile: CompanyRegistryProfile | null): EvidenceTraceNode[] {
  if (!profile) {
    return [
      {
        id: "synthetic-context",
        label: "Contexto da demonstração",
        detail: "Setor e região foram definidos no perfil sintético controlado pelo usuário.",
        kind: "context",
      },
    ];
  }

  const cnae = profile.primary_cnae_description
    ? `${profile.primary_cnae_code ?? "CNAE"} · ${profile.primary_cnae_description}`
    : "CNAE principal indisponível";
  const location = [profile.municipality, profile.state].filter(Boolean).join(" / ") || "Localização indisponível";

  return [
    {
      id: "registry-context",
      label: "Contexto cadastral público",
      detail: `${cnae}. ${location}. Este dado identifica atividade e localização; não é um evento adverso.`,
      kind: "context",
    },
    {
      id: "registry-source",
      label: profile.source_name,
      detail: "Proveniência preservada no lookup. O conector declara risk_signal=false.",
      kind: "source",
      sourceUrl: profile.source_url,
    },
  ];
}

export function buildEvidenceTraces({
  assessment,
  input,
  registryProfile,
}: BuildEvidenceTracesArgs): EvidenceTrace[] {
  const evidenceCoverage = toPercent(input.evidence_completeness);
  const evidenceGap = Math.max(0, 100 - evidenceCoverage);

  return [
    {
      id: "overall",
      title: "Risco SAC consolidado",
      summary: "Mostra quais camadas alimentam a síntese sem transformar o score em uma caixa-preta.",
      nodes: [
        {
          id: "overall-conclusion",
          label: `Risco SAC ${toPercent(assessment.overall_score)} · ${bandLabel[assessment.overall_band]}`,
          detail: assessment.human_review_required
            ? "A metodologia experimental acionou revisão humana."
            : "Nenhum gatilho determinístico de revisão foi acionado nesta execução.",
          kind: "conclusion",
        },
        {
          id: "overall-inherent",
          label: `Risco inerente ${scoreLabel(assessment.inherent_risk)}`,
          detail: "Exposição associada a setor, geografia e contexto climático.",
          kind: "context",
        },
        {
          id: "overall-observed",
          label: `Risco observado ${scoreLabel(assessment.observed_risk)}`,
          detail: "Na demo atual, esta camada usa sinais sintéticos controlados e não fatos adversos reais.",
          kind: "signal",
        },
        {
          id: "overall-boundary",
          label: "Fronteira de decisão",
          detail: "LLMs podem explicar e contestar, mas não reescrevem o score determinístico nem aprovam crédito.",
          kind: "boundary",
        },
      ],
    },
    {
      id: "environmental",
      title: "Dimensão ambiental",
      summary: "Separa exposição contextual de sinais específicos da contraparte.",
      nodes: [
        {
          id: "environmental-conclusion",
          label: `Ambiental ${scoreLabel(assessment.environmental_risk)}`,
          detail: assessment.environmental_risk.drivers.join(" · ") || "Sem drivers registrados.",
          kind: "conclusion",
        },
        ...registryContextNodes(registryProfile),
        {
          id: "environmental-sector",
          label: `Exposição setorial ${toPercent(input.sector_environmental_exposure)}%`,
          detail: "Parâmetro sintético de risco inerente da demonstração.",
          kind: "context",
        },
        {
          id: "environmental-geography",
          label: `Exposição geográfica ${toPercent(input.geographic_environmental_exposure)}%`,
          detail: "Parâmetro sintético de sensibilidade ambiental da demonstração.",
          kind: "context",
        },
        {
          id: "environmental-event",
          label: `Sinal ambiental observado ${toPercent(input.environmental_event_strength)}%`,
          detail: "Sinal sintético. Não deriva do cadastro CNPJ e não representa uma ocorrência real da empresa consultada.",
          kind: "signal",
        },
      ],
    },
    {
      id: "inherent",
      title: "Exposição inerente",
      summary: "Explica por que contexto de setor e geografia não pode virar alegação de conduta.",
      nodes: [
        {
          id: "inherent-conclusion",
          label: `Risco inerente ${scoreLabel(assessment.inherent_risk)}`,
          detail: "É exposição de contexto, não prova de irregularidade.",
          kind: "conclusion",
        },
        ...registryContextNodes(registryProfile),
        {
          id: "inherent-sector",
          label: input.sector,
          detail: "Setor usado pela simulação experimental.",
          kind: "context",
        },
        {
          id: "inherent-region",
          label: input.region,
          detail: "Região usada pela simulação experimental.",
          kind: "context",
        },
        {
          id: "inherent-boundary",
          label: "Contexto ≠ má conduta",
          detail: "ATLAS mantém risco inerente separado de eventos observados específicos da contraparte.",
          kind: "boundary",
        },
      ],
    },
    {
      id: "observed",
      title: "Sinais observados",
      summary: "Torna visível o que seria específico da contraparte e o que ainda é apenas simulação.",
      nodes: [
        {
          id: "observed-conclusion",
          label: `Risco observado ${scoreLabel(assessment.observed_risk)}`,
          detail: "A versão pública atual ainda usa sinais controlados e sintéticos nesta camada.",
          kind: "conclusion",
        },
        {
          id: "observed-social",
          label: `Sinal social ${toPercent(input.social_signal_strength)}%`,
          detail: "Sintético, definido na demonstração.",
          kind: "signal",
        },
        {
          id: "observed-environmental",
          label: `Sinal ambiental ${toPercent(input.environmental_event_strength)}%`,
          detail: "Sintético, definido na demonstração.",
          kind: "signal",
        },
        {
          id: "observed-reputational",
          label: `Sinal reputacional ${toPercent(input.reputational_signal_strength)}%`,
          detail: "Sintético, definido na demonstração.",
          kind: "signal",
        },
        {
          id: "observed-boundary",
          label: "Nenhuma inferência a partir do CNPJ",
          detail: "Identidade, CNAE e localização do registro público não são convertidos em evento adverso observado.",
          kind: "boundary",
        },
      ],
    },
    {
      id: "uncertainty",
      title: "Incerteza e lacunas",
      summary: "Mostra o que falta em vez de esconder ausência de informação dentro do score.",
      nodes: [
        {
          id: "uncertainty-coverage",
          label: `Cobertura de evidências ${evidenceCoverage}%`,
          detail: "Parâmetro de completude da execução experimental.",
          kind: "conclusion",
        },
        {
          id: "uncertainty-gap",
          label: `Lacuna informacional ${evidenceGap}%`,
          detail: "Parte da evidência esperada ainda não está disponível ou validada.",
          kind: "unknown",
        },
        {
          id: "uncertainty-boundary",
          label: "Ausência de evidência ≠ baixo risco",
          detail: "No ATLAS, falta de dado reduz confiança e pode aumentar a necessidade de revisão humana.",
          kind: "boundary",
        },
      ],
    },
  ];
}
