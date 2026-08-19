"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  apiUrl,
  loadMlEvaluation,
  runAiAssessment,
  runAssessment,
  runMlPrediction,
} from "@/lib/api";
import { DEMO_ASSESSMENT, DEMO_INPUT } from "@/lib/demo";
import { bandLabel, dimensionsOf, toPercent } from "@/lib/risk";
import type {
  AIAssessmentResponse,
  AssessmentMode,
  CounterpartyRiskInput,
  EvidenceInput,
  MLBaselineEvaluation,
  MLBaselinePrediction,
  RiskBand,
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

function RiskBar({ score, band }: { score: number; band: RiskBand }) {
  return (
    <div className="risk-bar" aria-label={`${toPercent(score)}%`}>
      <span
        className={`risk-bar-fill risk-${band.toLowerCase()}`}
        style={{ width: `${toPercent(score)}%` }}
      />
    </div>
  );
}

function EngineStatus({ mode }: { mode: AssessmentMode }) {
  const label = mode === "live" ? "Live" : mode === "error" ? "Offline" : "Preview";
  return <span className={`engine-status engine-${mode}`}>{label}</span>;
}

function MethodMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="method-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RiskFactorRow({
  label,
  score,
  band,
  drivers,
}: {
  label: string;
  score: number;
  band: RiskBand;
  drivers: string[];
}) {
  return (
    <div className="risk-factor-row">
      <div className="risk-factor-label">
        <strong>{label}</strong>
        <span>{drivers.slice(0, 2).join(" · ") || "Sem driver material nesta execução."}</span>
      </div>
      <div className="risk-factor-score">
        <span>{toPercent(score)}</span>
        <small className={`risk-text risk-${band.toLowerCase()}`}>{bandLabel[band]}</small>
      </div>
      <RiskBar score={score} band={band} />
    </div>
  );
}

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

  const evidenceRows = useMemo(
    () => [
      {
        source: "Synthetic profile",
        signal: "Sector environmental exposure",
        value: `${toPercent(input.sector_environmental_exposure)}%`,
        confidence: "Context",
        status: "Context",
      },
      {
        source: "Synthetic profile",
        signal: "Geographic environmental exposure",
        value: `${toPercent(input.geographic_environmental_exposure)}%`,
        confidence: "Context",
        status: "Context",
      },
      {
        source: "Synthetic signals",
        signal: "Observed environmental event strength",
        value: `${toPercent(input.environmental_event_strength)}%`,
        confidence: input.environmental_event_strength > 0.6 ? "High" : "Medium",
        status: "Observed",
      },
      {
        source: "Evidence gate",
        signal: "Evidence completeness",
        value: `${toPercent(input.evidence_completeness)}%`,
        confidence: input.evidence_completeness >= 0.8 ? "High" : "Limited",
        status: input.evidence_completeness >= 0.8 ? "Ready" : "Review",
      },
    ],
    [input],
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
      setError(err instanceof Error ? err.message : "Não foi possível consultar o risk engine.");
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
      setAiError(err instanceof Error ? err.message : "A revisão independente não pôde ser executada.");
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
          <span>SAC Risk Intelligence</span>
        </div>
        <div className="topbar-actions">
          <EngineStatus mode={mode} />
          <span className="topbar-method">Rules · ML · independent review</span>
        </div>
      </header>

      <aside className="sidebar" aria-label="Navegação principal">
        <div className="sidebar-group">
          <span className="sidebar-label">Workspace</span>
          <a className="sidebar-link active" href="#overview">Overview</a>
          <a className="sidebar-link" href="#evidence">Evidence</a>
          <a className="sidebar-link" href="#risk-factors">Risk factors</a>
          <a className="sidebar-link" href="#methodology">Methodology</a>
          <a className="sidebar-link" href="#review">Review queue</a>
        </div>

        <div className="sidebar-group sidebar-system">
          <span className="sidebar-label">System</span>
          <span className="system-item">Rules engine</span>
          <span className="system-item">ML baseline</span>
          <span className="system-item">AI review</span>
          <span className="system-endpoint">{apiUrl()}</span>
        </div>
      </aside>

      <div className="content">
        <section className="search-section" id="overview">
          <div className="section-intro">
            <span>Counterparty assessment</span>
            <h1>Evaluate a company</h1>
            <p>
              Evidence-first social, environmental and climate risk analysis with explicit
              uncertainty and human ownership.
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
                {loading ? "Evaluating…" : "Evaluate"}
              </button>
            </div>

            <div className="entity-fields">
              <label>
                <span>Sector</span>
                <input value={input.sector} onChange={(event) => updateText("sector", event.target.value)} />
              </label>
              <label>
                <span>Region</span>
                <input value={input.region} onChange={(event) => updateText("region", event.target.value)} />
              </label>
              <button className="button button-ghost" type="button" onClick={resetDemo}>
                Reset demo
              </button>
            </div>

            <details className="parameter-drawer">
              <summary>Assessment parameters</summary>
              <div className="parameter-grid">
                {sliderFields.map((field) => {
                  const value = input[field.key] as number;
                  return (
                    <label className="parameter-field" key={field.key}>
                      <div>
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
              <strong>Risk engine unavailable.</strong>
              <span>{error}. The synthetic preview remains visible.</span>
            </div>
          ) : null}
        </section>

        <section className="entity-header">
          <div>
            <h2>{assessment.company_name}</h2>
            <p>{input.region} · {input.sector}</p>
          </div>
          <div className="entity-badges">
            <span>Synthetic profile</span>
            <span>Experimental methodology</span>
          </div>
        </section>

        <section className="risk-overview panel">
          <div className="risk-score-block">
            <span className="panel-label">SAC risk</span>
            <div className="primary-score">
              <strong>{toPercent(assessment.overall_score)}</strong>
              <span className={`risk-text risk-${assessment.overall_band.toLowerCase()}`}>
                {bandLabel[assessment.overall_band]}
              </span>
            </div>
            <RiskBar score={assessment.overall_score} band={assessment.overall_band} />
          </div>

          <div className="decision-block">
            <span className="panel-label">Decision</span>
            <strong>
              {assessment.human_review_required ? "Human review required" : "No mandatory review"}
            </strong>
            <p>
              {assessment.human_review_required
                ? "Material signals or insufficient evidence prevent automatic closure."
                : "No mandatory review trigger was activated in this experimental run."}
            </p>
            <a className="button button-review" href="#review">
              {assessment.human_review_required ? "Open review" : "View decision"}
            </a>
          </div>

          <div className="dimension-summary">
            <div>
              <span>Environmental</span>
              <strong>{toPercent(assessment.environmental_risk.score)}</strong>
            </div>
            <div>
              <span>Social</span>
              <strong>{toPercent(assessment.social_risk.score)}</strong>
            </div>
            <div>
              <span>Climate</span>
              <strong>{toPercent(climateScore)}</strong>
            </div>
            <div>
              <span>Confidence</span>
              <strong>{toPercent(assessment.confidence)}%</strong>
            </div>
            <div>
              <span>Observed risk</span>
              <strong>{toPercent(assessment.observed_risk.score)}</strong>
            </div>
            <div>
              <span>Model signal</span>
              <strong>
                {mlPrediction ? `${toPercent(mlPrediction.predicted_material_risk_probability)}%` : "—"}
              </strong>
            </div>
          </div>
        </section>

        <section className="section-block" id="evidence">
          <div className="section-heading">
            <div>
              <h2>Evidence</h2>
              <p>What supports this assessment and what remains uncertain.</p>
            </div>
            <span className="section-note">Synthetic signals until public-data integration is merged</span>
          </div>

          <div className="table-panel panel">
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Signal</th>
                    <th>Value</th>
                    <th>Confidence</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {evidenceRows.map((row) => (
                    <tr key={`${row.source}-${row.signal}`}>
                      <td>{row.source}</td>
                      <td>{row.signal}</td>
                      <td>{row.value}</td>
                      <td>{row.confidence}</td>
                      <td>
                        <span className={`table-status status-${row.status.toLowerCase()}`}>
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="section-block" id="risk-factors">
          <div className="section-heading">
            <div>
              <h2>Risk factors</h2>
              <p>Material dimensions remain separate instead of collapsing into one opaque score.</p>
            </div>
            <span className="section-note">0–100 heuristic scale</span>
          </div>

          <div className="risk-factor-panel panel">
            {dimensions.map(({ key, label, dimension }) => (
              <RiskFactorRow
                key={key}
                label={label}
                score={dimension.score}
                band={dimension.band}
                drivers={dimension.drivers}
              />
            ))}
          </div>
        </section>

        <section className="section-block" id="methodology">
          <div className="section-heading">
            <div>
              <h2>Methodology</h2>
              <p>Separate layers make the system easier to challenge, reproduce and audit.</p>
            </div>
          </div>

          <div className="methodology-grid">
            <article className="panel method-panel">
              <div className="method-steps">
                <div>
                  <span>01</span>
                  <strong>Rules</strong>
                  <p>Deterministic score and review triggers.</p>
                </div>
                <div>
                  <span>02</span>
                  <strong>ML baseline</strong>
                  <p>A second statistical signal trained on synthetic data.</p>
                </div>
                <div>
                  <span>03</span>
                  <strong>Independent review</strong>
                  <p>Gemini proposes interpretation; Groq challenges unsupported claims.</p>
                </div>
                <div>
                  <span>04</span>
                  <strong>Human gate</strong>
                  <p>AI cannot remove a deterministic review requirement.</p>
                </div>
              </div>

              <div className="model-metrics">
                <MethodMetric label="ROC-AUC" value={mlEvaluation ? mlEvaluation.roc_auc.toFixed(3) : "—"} />
                <MethodMetric label="Precision" value={mlEvaluation ? mlEvaluation.precision.toFixed(3) : "—"} />
                <MethodMetric label="Recall" value={mlEvaluation ? mlEvaluation.recall.toFixed(3) : "—"} />
                <MethodMetric label="Brier score" value={mlEvaluation ? mlEvaluation.brier_score.toFixed(3) : "—"} />
              </div>

              <div className="method-footnote">
                <span>{mlPrediction?.model_version ?? "synthetic-logreg-v1"}</span>
                <span>{mlPrediction?.dataset_version ?? "atlas-sac-synthetic-v1"}</span>
                <span>Evidence completeness excluded from ML features</span>
              </div>
            </article>

            <article className="panel review-method-panel">
              <div className="review-method-head">
                <div>
                  <span className="panel-label">Independent model review</span>
                  <h3>Interpretation with challenge</h3>
                </div>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={runDualModelReview}
                  disabled={aiLoading}
                >
                  {aiLoading ? "Reviewing…" : "Run review"}
                </button>
              </div>

              {aiError ? <div className="inline-alert inline-alert-error">{aiError}</div> : null}

              {!aiReview ? (
                <div className="review-empty">
                  <p>
                    The LLM layer is intentionally downstream from rules and ML. It can explain,
                    challenge and request more information, but it cannot rewrite deterministic
                    scores.
                  </p>
                </div>
              ) : (
                <div className="review-result">
                  <div className="review-row">
                    <span>Analyst</span>
                    <strong>{aiReview.analyst?.summary ?? "Unavailable"}</strong>
                  </div>
                  <div className="review-row">
                    <span>Reviewer</span>
                    <strong>{aiReview.reviewer?.verdict ?? "NO OUTPUT"}</strong>
                    <p>{aiReview.reviewer?.rationale ?? aiReview.degradation_reason}</p>
                  </div>
                  <div className="review-row review-gate-row">
                    <span>Decision gate</span>
                    <strong>{aiReview.decision_gate.replaceAll("_", " ")}</strong>
                    <p>
                      {aiReview.disagreement
                        ? "Model disagreement detected. Human review remains mandatory."
                        : "No material model disagreement detected in this run."}
                    </p>
                  </div>
                  <div className="provider-traces">
                    {aiReview.provider_runs.map((run) => (
                      <span key={`${run.provider}-${run.role}`}>
                        {run.role} · {run.model} · {run.latency_ms}ms · {run.prompt_version}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </div>
        </section>

        <section className="section-block" id="review">
          <div className="section-heading">
            <div>
              <h2>Review queue</h2>
              <p>Why this assessment needs a person, or why it can move forward.</p>
            </div>
          </div>

          <div className={`review-panel panel ${assessment.human_review_required ? "review-required" : "review-clear"}`}>
            <div>
              <span className="panel-label">Decision state</span>
              <h3>{assessment.human_review_required ? "Human review required" : "No mandatory review"}</h3>
              <p>{assessment.methodology}</p>
            </div>
            <div className="review-reasons">
              <span className="panel-label">Triggers</span>
              <ul>
                {assessment.review_reasons.length ? (
                  assessment.review_reasons.map((reason) => <li key={reason}>{reason}</li>)
                ) : (
                  <li>No mandatory trigger in this execution.</li>
                )}
              </ul>
            </div>
          </div>
        </section>

        <footer className="footer">
          <strong>ATLAS SAC</strong>
          <span>Independent engineering portfolio project · Synthetic methodology demo</span>
        </footer>
      </div>
    </main>
  );
}
