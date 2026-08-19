"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AppSidebar,
  EngineStatus,
  EvidenceStateStrip,
  EvidenceTable,
  HumanReview,
  Methodology,
  RiskFactors,
  RiskOverview,
  type EvidenceRow,
} from "@/components/assessment";
import {
  loadMlEvaluation,
  runAiAssessment,
  runAssessment,
  runMlPrediction,
} from "@/lib/api";
import { DEMO_ASSESSMENT, DEMO_INPUT } from "@/lib/demo";
import { dimensionsOf, toPercent } from "@/lib/risk";
import type {
  AIAssessmentResponse,
  AssessmentMode,
  CounterpartyRiskInput,
  EvidenceInput,
  MLBaselineEvaluation,
  MLBaselinePrediction,
  SACAssessment,
} from "@/lib/types";

const sliderFields: Array<{
  key: keyof CounterpartyRiskInput;
  label: string;
  hint: string;
}> = [
  {
    key: "sector_environmental_exposure",
    label: "Exposição ambiental do setor",
    hint: "Risco inerente associado à atividade econômica.",
  },
  {
    key: "geographic_environmental_exposure",
    label: "Exposição ambiental geográfica",
    hint: "Sensibilidade ambiental associada à localização.",
  },
  {
    key: "climate_physical_exposure",
    label: "Exposição climática física",
    hint: "Exposição a eventos físicos e extremos.",
  },
  {
    key: "climate_transition_exposure",
    label: "Exposição climática de transição",
    hint: "Pressões regulatórias, tecnológicas ou econômicas.",
  },
  {
    key: "social_signal_strength",
    label: "Sinais sociais observados",
    hint: "Intensidade de sinais específicos da contraparte.",
  },
  {
    key: "environmental_event_strength",
    label: "Eventos ambientais observados",
    hint: "Força dos sinais ambientais específicos da contraparte.",
  },
  {
    key: "reputational_signal_strength",
    label: "Sinais reputacionais",
    hint: "Sinais externos que exigem análise contextual.",
  },
  {
    key: "evidence_completeness",
    label: "Completude das evidências",
    hint: "Quanto da informação necessária está disponível e verificável.",
  },
];

export default function HomePage() {
  const [input, setInput] = useState<CounterpartyRiskInput>(DEMO_INPUT);
  const [assessment, setAssessment] = useState<SACAssessment>(DEMO_ASSESSMENT);
  const [mode, setMode] = useState<AssessmentMode>("preview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mlPrediction, setMlPrediction] = useState<MLBaselinePrediction | null>(null);
  const [mlEvaluation, setMlEvaluation] = useState<MLBaselineEvaluation | null>(null);
  const [aiReview, setAiReview] = useState<AIAssessmentResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const dimensions = useMemo(() => dimensionsOf(assessment), [assessment]);
  const climateScore = useMemo(
    () => (assessment.climate_physical_risk.score + assessment.climate_transition_risk.score) / 2,
    [assessment],
  );
  const evidenceCoverage = toPercent(input.evidence_completeness);
  const observedSignalCount = useMemo(
    () => [
      input.social_signal_strength,
      input.environmental_event_strength,
      input.reputational_signal_strength,
    ].filter((value) => value >= 0.5).length,
    [input],
  );

  const evidenceRows = useMemo<EvidenceRow[]>(
    () => [
      {
        source: "Perfil sintético",
        signal: "Exposição ambiental setorial",
        value: `${toPercent(input.sector_environmental_exposure)}%`,
        confidence: "Contexto",
        status: "CONTEXTO",
        tone: "context",
      },
      {
        source: "Perfil sintético",
        signal: "Exposição ambiental geográfica",
        value: `${toPercent(input.geographic_environmental_exposure)}%`,
        confidence: "Contexto",
        status: "CONTEXTO",
        tone: "context",
      },
      {
        source: "Sinais sintéticos",
        signal: "Força do evento ambiental observado",
        value: `${toPercent(input.environmental_event_strength)}%`,
        confidence: input.environmental_event_strength > 0.6 ? "Alta" : "Moderada",
        status: "OBSERVADO",
        tone: "observed",
      },
      {
        source: "Lacuna de evidência",
        signal: "Completude documental",
        value: `${evidenceCoverage}%`,
        confidence: input.evidence_completeness >= 0.8 ? "Suficiente" : "Limitada",
        status: input.evidence_completeness >= 0.8 ? "COBERTURA" : "DESCONHECIDO",
        tone: input.evidence_completeness >= 0.8 ? "verified" : "unknown",
      },
    ],
    [evidenceCoverage, input],
  );

  useEffect(() => {
    let active = true;
    loadMlEvaluation()
      .then((result) => {
        if (active) setMlEvaluation(result);
      })
      .catch(() => {
        if (active) setMlEvaluation(null);
      });
    return () => {
      active = false;
    };
  }, []);

  function updateText(key: "company_name" | "sector" | "region", value: string) {
    setInput((current) => ({ ...current, [key]: value }));
  }

  function updateNumber(key: keyof CounterpartyRiskInput, value: string) {
    setInput((current) => ({ ...current, [key]: Number(value) }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setAiReview(null);
    setAiError(null);

    try {
      const [riskResult, modelResult] = await Promise.all([
        runAssessment(input),
        runMlPrediction(input),
      ]);
      setAssessment(riskResult);
      setMlPrediction(modelResult);
      setMode("live");
    } catch (err) {
      setMode("error");
      setError(err instanceof Error ? err.message : "Não foi possível consultar o motor de risco.");
    } finally {
      setLoading(false);
    }
  }

  async function runDualModelReview() {
    setAiLoading(true);
    setAiError(null);

    const evidence: EvidenceInput[] = [
      {
        evidence_type: "synthetic_demo_context",
        source_name: "ATLAS synthetic counterparty lab",
        payload: {
          sector: input.sector,
          region: input.region,
          note: "Synthetic user-controlled demo signals. Not an external factual source.",
        },
        is_synthetic: true,
      },
    ];

    try {
      setAiReview(await runAiAssessment(input, evidence));
    } catch (err) {
      setAiReview(null);
      setAiError(
        err instanceof Error
          ? err.message
          : "O contraditório independente não pôde ser executado.",
      );
    } finally {
      setAiLoading(false);
    }
  }

  function resetDemo() {
    setInput(DEMO_INPUT);
    setAssessment(DEMO_ASSESSMENT);
    setMlPrediction(null);
    setAiReview(null);
    setMode("preview");
    setError(null);
    setAiError(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-brand">
          <strong>ATLAS</strong>
          <span>Inteligência de Risco SAC</span>
        </div>
        <div className="topbar-actions">
          <EngineStatus mode={mode} />
          <span className="topbar-method">Evidência → risco → decisão humana</span>
        </div>
      </header>

      <AppSidebar />

      <div className="content">
        <section className="search-section" id="resumo">
          <div className="section-intro">
            <span>Avaliação de contraparte</span>
            <h1>Entenda o risco antes da decisão.</h1>
            <p>
              O ATLAS separa exposição, sinais observados e lacunas de evidência para tornar a
              análise socioambiental e climática rastreável, contestável e revisável por pessoas.
            </p>
          </div>

          <form className="counterparty-form" onSubmit={submit}>
            <div className="search-row">
              <input
                aria-label="Empresa ou contraparte"
                className="company-search"
                value={input.company_name}
                onChange={(event) => updateText("company_name", event.target.value)}
              />
              <button className="button button-primary" type="submit" disabled={loading}>
                {loading ? "Analisando…" : "Analisar"}
              </button>
            </div>

            <div className="entity-fields">
              <label>
                <span>Setor</span>
                <input
                  value={input.sector}
                  onChange={(event) => updateText("sector", event.target.value)}
                />
              </label>
              <label>
                <span>Região</span>
                <input
                  value={input.region}
                  onChange={(event) => updateText("region", event.target.value)}
                />
              </label>
              <button className="button button-ghost" type="button" onClick={resetDemo}>
                Restaurar demonstração
              </button>
            </div>

            <details className="parameter-drawer">
              <summary>Parâmetros da demonstração</summary>
              <div className="parameter-grid">
                {sliderFields.map((field) => {
                  const value = input[field.key] as number;
                  return (
                    <label className="parameter-field" key={field.key}>
                      <div><span>{field.label}</span><strong>{toPercent(value)}</strong></div>
                      <input
                        aria-label={field.label}
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={value}
                        onChange={(event) => updateNumber(field.key, event.target.value)}
                      />
                      <small>{field.hint}</small>
                    </label>
                  );
                })}
              </div>
            </details>
          </form>

          {error ? (
            <div className="inline-alert inline-alert-error">
              <strong>Motor de risco indisponível.</strong>
              <span>{error}. A prévia sintética continua visível.</span>
            </div>
          ) : null}
        </section>

        <section className="entity-header">
          <div>
            <h2>{assessment.company_name}</h2>
            <p>{input.region} · {input.sector}</p>
          </div>
          <div className="entity-badges">
            <span>Perfil sintético</span>
            <span>Metodologia experimental</span>
          </div>
        </section>

        <RiskOverview assessment={assessment} climateScore={climateScore} />
        <EvidenceStateStrip coverage={evidenceCoverage} observedSignalCount={observedSignalCount} />
        <EvidenceTable rows={evidenceRows} />
        <RiskFactors dimensions={dimensions} />
        <Methodology
          mlEvaluation={mlEvaluation}
          mlPrediction={mlPrediction}
          aiReview={aiReview}
          aiLoading={aiLoading}
          aiError={aiError}
          onRunReview={runDualModelReview}
        />
        <HumanReview assessment={assessment} />

        <footer className="footer">
          <strong>ATLAS SAC</strong>
          <span>Projeto independente de engenharia · metodologia experimental e rastreável</span>
        </footer>
      </div>
    </main>
  );
}
