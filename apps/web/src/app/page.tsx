"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  AppSidebar,
  EngineStatus,
  EvidenceStateStrip,
  HumanReview,
  Methodology,
  RiskFactors,
  RiskOverview,
  type EvidenceRow,
} from "@/components/assessment";
import { EvidenceTable } from "@/components/evidence-table";
import { RegistryProfileCard } from "@/components/registry-profile";
import {
  loadMlEvaluation,
  lookupCompanyRegistry,
  runAiAssessment,
  runAssessment,
  runMlPrediction,
} from "@/lib/api";
import { DEMO_ASSESSMENT, DEMO_INPUT } from "@/lib/demo";
import {
  formatCnpj,
  normalizeCnpj,
  registryProfileToContext,
  registryProfileToEvidence,
} from "@/lib/registry";
import { dimensionsOf, toPercent } from "@/lib/risk";
import type {
  AIAssessmentResponse,
  AssessmentMode,
  CompanyRegistryProfile,
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
    hint: "Risco inerente associado à atividade econômica. Valor controlado da simulação.",
  },
  {
    key: "geographic_environmental_exposure",
    label: "Exposição ambiental geográfica",
    hint: "Sensibilidade ambiental associada à localização. Valor controlado da simulação.",
  },
  {
    key: "climate_physical_exposure",
    label: "Exposição climática física",
    hint: "Exposição a eventos físicos e extremos. Valor controlado da simulação.",
  },
  {
    key: "climate_transition_exposure",
    label: "Exposição climática de transição",
    hint: "Pressões regulatórias, tecnológicas ou econômicas. Valor controlado da simulação.",
  },
  {
    key: "social_signal_strength",
    label: "Sinais sociais observados",
    hint: "Sinal sintético usado apenas para demonstrar o comportamento do motor.",
  },
  {
    key: "environmental_event_strength",
    label: "Eventos ambientais observados",
    hint: "Sinal sintético usado apenas para demonstrar o comportamento do motor.",
  },
  {
    key: "reputational_signal_strength",
    label: "Sinais reputacionais",
    hint: "Sinal sintético usado apenas para demonstrar o comportamento do motor.",
  },
  {
    key: "evidence_completeness",
    label: "Completude das evidências",
    hint: "Cobertura sintética da demonstração. Lacunas reduzem confiança, não risco.",
  },
];

export default function HomePage() {
  const [input, setInput] = useState<CounterpartyRiskInput>(DEMO_INPUT);
  const [assessment, setAssessment] = useState<SACAssessment>(DEMO_ASSESSMENT);
  const [mode, setMode] = useState<AssessmentMode>("preview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessmentVisible, setAssessmentVisible] = useState(true);

  const [cnpjQuery, setCnpjQuery] = useState("");
  const [registryProfile, setRegistryProfile] = useState<CompanyRegistryProfile | null>(null);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);

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

  const evidenceRows = useMemo<EvidenceRow[]>(() => {
    const rows: EvidenceRow[] = [];

    if (registryProfile) {
      rows.push({
        source: registryProfile.source_name,
        signal: "Identidade cadastral, CNAE e localização",
        value: formatCnpj(registryProfile.cnpj),
        confidence: "Proveniência registrada",
        status: "CONTEXTO",
        tone: "context",
      });
    }

    rows.push(
      {
        source: "Perfil da simulação",
        signal: "Exposição ambiental setorial",
        value: `${toPercent(input.sector_environmental_exposure)}%`,
        confidence: "Sintética",
        status: "CONTEXTO",
        tone: "context",
      },
      {
        source: "Perfil da simulação",
        signal: "Exposição ambiental geográfica",
        value: `${toPercent(input.geographic_environmental_exposure)}%`,
        confidence: "Sintética",
        status: "CONTEXTO",
        tone: "context",
      },
      {
        source: "Sinais da simulação",
        signal: "Força do evento ambiental observado",
        value: `${toPercent(input.environmental_event_strength)}%`,
        confidence: input.environmental_event_strength > 0.6 ? "Alta na simulação" : "Moderada na simulação",
        status: "OBSERVADO",
        tone: "observed",
      },
      {
        source: "Lacuna da simulação",
        signal: "Completude documental",
        value: `${evidenceCoverage}%`,
        confidence: input.evidence_completeness >= 0.8 ? "Suficiente" : "Limitada",
        status: input.evidence_completeness >= 0.8 ? "COBERTURA" : "DESCONHECIDO",
        tone: input.evidence_completeness >= 0.8 ? "verified" : "unknown",
      },
    );

    return rows;
  }, [evidenceCoverage, input, registryProfile]);

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

  async function lookupCnpj(event: FormEvent) {
    event.preventDefault();
    setRegistryLoading(true);
    setRegistryError(null);
    setError(null);

    const normalized = normalizeCnpj(cnpjQuery);
    if (normalized.length !== 14) {
      setRegistryError("Informe um CNPJ com 14 dígitos.");
      setRegistryLoading(false);
      return;
    }

    try {
      const profile = await lookupCompanyRegistry(normalized);
      const context = registryProfileToContext(profile);

      setRegistryProfile(profile);
      setCnpjQuery(formatCnpj(profile.cnpj));
      setInput((current) => ({
        ...current,
        company_name: context.company_name,
        sector: context.sector,
        region: context.region,
      }));
      setAssessment((current) => ({ ...current, company_name: context.company_name }));
      setMlPrediction(null);
      setAiReview(null);
      setAiError(null);
      setMode("preview");
      setAssessmentVisible(false);
    } catch (err) {
      setRegistryProfile(null);
      setRegistryError(
        err instanceof Error ? err.message : "Não foi possível consultar o cadastro público.",
      );
    } finally {
      setRegistryLoading(false);
    }
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
      setAssessmentVisible(true);
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

    const evidence: EvidenceInput[] = [];
    if (registryProfile) evidence.push(registryProfileToEvidence(registryProfile));

    evidence.push({
      evidence_type: "synthetic_demo_context",
      source_name: "ATLAS synthetic counterparty lab",
      payload: {
        sector: input.sector,
        region: input.region,
        note: "Synthetic user-controlled risk signals. Public registry context, when present, is identity/context only and not an adverse finding.",
      },
      is_synthetic: true,
    });

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
    setCnpjQuery("");
    setRegistryProfile(null);
    setRegistryError(null);
    setInput(DEMO_INPUT);
    setAssessment(DEMO_ASSESSMENT);
    setMlPrediction(null);
    setAiReview(null);
    setMode("preview");
    setError(null);
    setAiError(null);
    setAssessmentVisible(true);
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
            <h1>Comece pela empresa. Termine na evidência.</h1>
            <p>
              Consulte um CNPJ para carregar identidade, CNAE, localização e proveniência. O cadastro
              público entra como contexto verificável e nunca como sinal adverso por si só.
            </p>
          </div>

          <form className="registry-search" onSubmit={lookupCnpj}>
            <div className="registry-search-row">
              <input
                aria-label="CNPJ"
                className="registry-input"
                inputMode="numeric"
                autoComplete="off"
                placeholder="00.000.000/0000-00"
                value={cnpjQuery}
                onChange={(event) => setCnpjQuery(event.target.value)}
              />
              <button className="button button-primary" type="submit" disabled={registryLoading}>
                {registryLoading ? "Consultando…" : "Buscar CNPJ"}
              </button>
            </div>
            <p className="registry-search-help">
              O cadastro público preenche contexto empresarial. Nenhum score SAC é calculado a partir
              do CNPJ nesta etapa.
            </p>
          </form>

          {registryError ? (
            <div className="inline-alert inline-alert-error">
              <strong>Consulta cadastral não concluída.</strong>
              <span>{registryError}</span>
            </div>
          ) : null}

          {registryProfile ? <RegistryProfileCard profile={registryProfile} /> : null}

          <form className="counterparty-form" onSubmit={submit}>
            <div className="analysis-controls">
              <label>
                <span>Setor usado na simulação</span>
                <input
                  value={input.sector}
                  onChange={(event) => updateText("sector", event.target.value)}
                />
              </label>
              <label>
                <span>Região usada na simulação</span>
                <input
                  value={input.region}
                  onChange={(event) => updateText("region", event.target.value)}
                />
              </label>
              <div className="analysis-actions">
                <button className="button button-primary" type="submit" disabled={loading}>
                  {loading ? "Analisando…" : "Executar simulação"}
                </button>
                <button className="button button-ghost" type="button" onClick={resetDemo}>
                  Restaurar demo
                </button>
              </div>
            </div>
            <p className="analysis-context-note">
              Os controles SAC abaixo continuam sintéticos. Se um CNPJ foi carregado, somente a
              identidade, CNAE e localização vêm do cadastro público.
            </p>

            <details className="parameter-drawer">
              <summary>Parâmetros sintéticos da simulação</summary>
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
              <span>{error}. Nenhuma decisão deve ser inferida desta tentativa.</span>
            </div>
          ) : null}
        </section>

        {assessmentVisible ? (
          <>
            <section className="entity-header">
              <div>
                <h2>{assessment.company_name}</h2>
                <p>{input.region} · {input.sector}</p>
              </div>
              <div className="entity-badges">
                {registryProfile ? <span>Contexto cadastral público</span> : <span>Perfil sintético</span>}
                <span>Sinais SAC sintéticos</span>
              </div>
            </section>

            {registryProfile ? (
              <div className="inline-alert simulation-disclaimer">
                <strong>Simulação experimental.</strong>
                <span>
                  O score abaixo usa parâmetros SAC sintéticos e não representa uma avaliação real
                  da empresa consultada. O CNPJ fornece apenas contexto cadastral e proveniência.
                </span>
              </div>
            ) : null}

            <RiskOverview assessment={assessment} climateScore={climateScore} />
            <EvidenceStateStrip
              coverage={evidenceCoverage}
              observedSignalCount={observedSignalCount}
            />
            <EvidenceTable
              rows={evidenceRows}
              hasPublicRegistryContext={Boolean(registryProfile)}
            />
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
          </>
        ) : (
          <section className="registry-next-step panel" aria-label="Próximo passo da análise">
            <span className="panel-label">Contexto carregado</span>
            <h2>Cadastro identificado. O risco ainda não foi calculado.</h2>
            <p>
              Revise o contexto cadastral e, se quiser explorar o motor, execute a simulação
              experimental. Os parâmetros SAC permanecem sintéticos e separados do cadastro.
            </p>
          </section>
        )}

        <footer className="footer">
          <strong>ATLAS SAC</strong>
          <span>Projeto independente de engenharia · evidência, incerteza e decisão humana</span>
        </footer>
      </div>
    </main>
  );
}
