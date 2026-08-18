"use client";

import { FormEvent, useMemo, useState } from "react";

import { apiUrl, runAssessment } from "@/lib/api";
import { DEMO_ASSESSMENT, DEMO_INPUT } from "@/lib/demo";
import { bandLabel, dimensionsOf, toPercent } from "@/lib/risk";
import type { AssessmentMode, CounterpartyRiskInput, RiskBand, SACAssessment } from "@/lib/types";

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
    hint: "Exposição sintética a eventos físicos e extremos.",
  },
  {
    key: "climate_transition_exposure",
    label: "Exposição climática de transição",
    hint: "Pressões de transição regulatória, tecnológica ou econômica.",
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
    label: "Sinais reputacionais / contexto",
    hint: "Sinais externos que exigem análise contextual.",
  },
  {
    key: "evidence_completeness",
    label: "Completude das evidências",
    hint: "Quanto da informação necessária está disponível e verificável.",
  },
];

function ScoreBar({ score, band }: { score: number; band: RiskBand }) {
  return (
    <div className="score-track" aria-label={`${toPercent(score)}%`}>
      <span className={`score-fill band-${band.toLowerCase()}`} style={{ width: `${toPercent(score)}%` }} />
    </div>
  );
}

function StatusPill({ mode }: { mode: AssessmentMode }) {
  if (mode === "live") return <span className="status-pill live">LIVE ENGINE</span>;
  if (mode === "error") return <span className="status-pill error">API OFFLINE</span>;
  return <span className="status-pill preview">SYNTHETIC PREVIEW</span>;
}

function DimensionCard({ label, score, band, drivers }: { label: string; score: number; band: RiskBand; drivers: string[] }) {
  return (
    <article className="dimension-card">
      <div className="dimension-head">
        <div>
          <span className="eyebrow">DIMENSÃO</span>
          <h3>{label}</h3>
        </div>
        <strong className={`band-text band-${band.toLowerCase()}`}>{bandLabel[band]}</strong>
      </div>
      <div className="dimension-score">
        <span>{toPercent(score)}</span>
        <small>/100</small>
      </div>
      <ScoreBar score={score} band={band} />
      <p>{drivers.join(" · ")}</p>
    </article>
  );
}

export default function HomePage() {
  const [input, setInput] = useState<CounterpartyRiskInput>(DEMO_INPUT);
  const [assessment, setAssessment] = useState<SACAssessment>(DEMO_ASSESSMENT);
  const [mode, setMode] = useState<AssessmentMode>("preview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dimensions = useMemo(() => dimensionsOf(assessment), [assessment]);

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
    try {
      const result = await runAssessment(input);
      setAssessment(result);
      setMode("live");
    } catch (err) {
      setMode("error");
      setError(err instanceof Error ? err.message : "Não foi possível consultar o risk engine.");
    } finally {
      setLoading(false);
    }
  }

  function resetDemo() {
    setInput(DEMO_INPUT);
    setAssessment(DEMO_ASSESSMENT);
    setMode("preview");
    setError(null);
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand">
          <div className="mark" aria-hidden="true">A</div>
          <div>
            <strong>ATLAS SAC</strong>
            <span>Risk Intelligence</span>
          </div>
        </div>
        <div className="topbar-meta">
          <StatusPill mode={mode} />
          <span className="method-tag">methodology v0.2</span>
        </div>
      </header>

      <section className="hero shell">
        <div className="hero-copy">
          <span className="kicker">SOCIAL · AMBIENTAL · CLIMÁTICO</span>
          <h1>Risco explicável, antes da narrativa.</h1>
          <p>
            Uma plataforma experimental que separa risco inerente, sinais observados e incerteza
            antes de permitir qualquer conclusão automatizada.
          </p>
        </div>
        <div className="hero-note">
          <span>PORTFÓLIO / PESQUISA</span>
          <p>Dados sintéticos. Não é score de crédito, rating regulatório ou aconselhamento financeiro.</p>
        </div>
      </section>

      <section className="workspace shell">
        <aside className="control-panel">
          <div className="section-title">
            <div>
              <span className="eyebrow">COUNTERPARTY LAB</span>
              <h2>Teste o motor</h2>
            </div>
            <button className="ghost-button" type="button" onClick={resetDemo}>Reset</button>
          </div>

          <form onSubmit={submit}>
            <label className="field-label">
              Empresa sintética
              <input value={input.company_name} onChange={(e) => updateText("company_name", e.target.value)} />
            </label>
            <label className="field-label">
              Setor
              <input value={input.sector} onChange={(e) => updateText("sector", e.target.value)} />
            </label>
            <label className="field-label">
              Região
              <input value={input.region} onChange={(e) => updateText("region", e.target.value)} />
            </label>

            <div className="sliders">
              {sliderFields.map((field) => {
                const value = input[field.key] as number;
                return (
                  <label className="slider-row" key={field.key}>
                    <div className="slider-copy">
                      <span>{field.label}</span>
                      <strong>{toPercent(value)}</strong>
                    </div>
                    <input
                      aria-label={field.label}
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={value}
                      onChange={(e) => updateNumber(field.key, e.target.value)}
                    />
                    <small>{field.hint}</small>
                  </label>
                );
              })}
            </div>

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? "Executando avaliação…" : "Run live assessment"}
            </button>
            <p className="endpoint">FastAPI: {apiUrl()}</p>
            {error ? <p className="error-box">{error}. A prévia sintética permanece visível.</p> : null}
          </form>
        </aside>

        <div className="dashboard">
          <section className="summary-card">
            <div className="summary-main">
              <span className="eyebrow">SAC RISK PROFILE</span>
              <h2>{assessment.company_name}</h2>
              <div className="entity-meta">
                <span>{input.sector}</span>
                <span>{input.region}</span>
              </div>
            </div>

            <div className="overall-score">
              <span className="eyebrow">RISCO CONSOLIDADO</span>
              <div className="score-line">
                <strong>{toPercent(assessment.overall_score)}</strong>
                <span>/100</span>
              </div>
              <b className={`band-text band-${assessment.overall_band.toLowerCase()}`}>
                {bandLabel[assessment.overall_band]}
              </b>
            </div>

            <div className={`review-gate ${assessment.human_review_required ? "required" : "clear"}`}>
              <span className="eyebrow">DECISION GATE</span>
              <strong>{assessment.human_review_required ? "HUMAN REVIEW REQUIRED" : "NO MANDATORY REVIEW"}</strong>
              <p>
                {assessment.human_review_required
                  ? "O motor bloqueia conclusão automática enquanto houver sinais materiais ou incerteza relevante."
                  : "Nenhum gatilho de revisão obrigatória foi acionado nesta avaliação experimental."}
              </p>
            </div>
          </section>

          <section className="signal-grid">
            <article className="signal-card">
              <span className="eyebrow">RISCO INERENTE</span>
              <div className="signal-number">{toPercent(assessment.inherent_risk.score)}</div>
              <ScoreBar score={assessment.inherent_risk.score} band={assessment.inherent_risk.band} />
              <p>Exposição de setor, geografia e clima. Não representa conduta da empresa.</p>
            </article>
            <article className="signal-card">
              <span className="eyebrow">RISCO OBSERVADO</span>
              <div className="signal-number">{toPercent(assessment.observed_risk.score)}</div>
              <ScoreBar score={assessment.observed_risk.score} band={assessment.observed_risk.band} />
              <p>Sinais específicos da contraparte, modelados separadamente do risco inerente.</p>
            </article>
            <article className="signal-card confidence-card">
              <span className="eyebrow">CONFIANÇA / EVIDÊNCIA</span>
              <div className="signal-number">{toPercent(assessment.confidence)}</div>
              <ScoreBar
                score={assessment.confidence}
                band={assessment.confidence < 0.6 ? "HIGH" : assessment.confidence < 0.8 ? "MEDIUM" : "LOW"}
              />
              <p>Baixa completude não reduz risco. Ela reduz confiança e força revisão.</p>
            </article>
          </section>

          <section>
            <div className="section-heading-inline">
              <div>
                <span className="eyebrow">RISK DOMAINS</span>
                <h2>Dimensões materiais</h2>
              </div>
              <span className="quiet">Scores heurísticos, 0–100</span>
            </div>
            <div className="dimension-grid">
              {dimensions.map(({ key, label, dimension }) => (
                <DimensionCard
                  key={key}
                  label={label}
                  score={dimension.score}
                  band={dimension.band}
                  drivers={dimension.drivers}
                />
              ))}
            </div>
          </section>

          <section className="trace-card">
            <div className="section-heading-inline">
              <div>
                <span className="eyebrow">DECISION TRACE</span>
                <h2>Da evidência até a revisão</h2>
              </div>
              <span className="quiet">Explainability first</span>
            </div>

            <div className="trace-flow">
              <div className="trace-node">
                <span>01</span>
                <strong>Inputs</strong>
                <p>Setor, região e sinais sintéticos normalizados.</p>
              </div>
              <div className="trace-arrow">→</div>
              <div className="trace-node">
                <span>02</span>
                <strong>Rules</strong>
                <p>Inerente e observado permanecem separados.</p>
              </div>
              <div className="trace-arrow">→</div>
              <div className="trace-node">
                <span>03</span>
                <strong>Uncertainty</strong>
                <p>Completude: {toPercent(assessment.confidence)}%.</p>
              </div>
              <div className="trace-arrow">→</div>
              <div className="trace-node emphasis">
                <span>04</span>
                <strong>{assessment.human_review_required ? "Human review" : "Result"}</strong>
                <p>{bandLabel[assessment.overall_band]} · {toPercent(assessment.overall_score)}/100</p>
              </div>
            </div>

            <div className="trace-detail">
              <div>
                <span className="eyebrow">TRIGGERS</span>
                <ul>
                  {assessment.review_reasons.length ? (
                    assessment.review_reasons.map((reason) => <li key={reason}>{reason}</li>)
                  ) : (
                    <li>Nenhum gatilho obrigatório nesta execução.</li>
                  )}
                </ul>
              </div>
              <div>
                <span className="eyebrow">METHODOLOGY</span>
                <p>{assessment.methodology}</p>
              </div>
            </div>
          </section>
        </div>
      </section>

      <footer className="footer shell">
        <div>
          <strong>ATLAS SAC</strong>
          <p>Independent engineering portfolio project.</p>
        </div>
        <p>AI will be added as an assistive reviewer, never as the source of truth.</p>
      </footer>
    </main>
  );
}
