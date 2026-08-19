"use client";

import { apiUrl } from "@/lib/api";
import { bandLabel, toPercent } from "@/lib/risk";
import type {
  AIAssessmentResponse,
  AssessmentMode,
  MLBaselineEvaluation,
  MLBaselinePrediction,
  RiskBand,
  RiskDimension,
  SACAssessment,
} from "@/lib/types";

export type EvidenceRow = {
  source: string;
  signal: string;
  value: string;
  confidence: string;
  status: string;
  tone: "context" | "observed" | "unknown" | "verified";
};

type DimensionRow = {
  key: string;
  label: string;
  dimension: RiskDimension;
};

const driverTranslations: Record<string, string> = {
  "sector exposure": "exposição setorial",
  "geographic exposure": "exposição geográfica",
  "physical climate exposure": "exposição climática física",
  "transition exposure": "exposição de transição",
  "environmental events": "eventos ambientais",
  "social signals": "sinais sociais",
  "reputational/context signals": "sinais reputacionais e de contexto",
  "company-specific social signal strength": "sinal social específico da contraparte",
  "sector environmental exposure": "exposição ambiental do setor",
  "geographic environmental exposure": "exposição ambiental geográfica",
  "observed environmental event strength": "evento ambiental observado",
  "geographic physical climate exposure": "exposição climática física geográfica",
  "sector transition exposure": "exposição setorial de transição",
  "company-specific reputational/context signal strength": "sinal reputacional específico da contraparte",
};

const reviewReasonTranslations: Record<string, string> = {
  "high consolidated demo risk": "risco consolidado elevado na metodologia experimental",
  "insufficient evidence completeness": "completude de evidências insuficiente",
  "high company-specific observed signal": "sinal observado específico da contraparte em nível elevado",
  "high material SAC dimension": "dimensão SAC material em nível elevado",
};

const translateDriver = (driver: string) => driverTranslations[driver] ?? driver;
const translateReviewReason = (reason: string) => reviewReasonTranslations[reason] ?? reason;

export function EngineStatus({ mode }: { mode: AssessmentMode }) {
  const label = mode === "live" ? "Ao vivo" : mode === "error" ? "Offline" : "Prévia";
  return <span className={`engine-status engine-${mode}`}>{label}</span>;
}

export function AppSidebar() {
  return (
    <aside className="sidebar" aria-label="Navegação principal">
      <div className="sidebar-group">
        <span className="sidebar-label">Análise</span>
        <a className="sidebar-link active" href="#resumo">Resumo</a>
        <a className="sidebar-link" href="#evidencias">Evidências</a>
        <a className="sidebar-link" href="#fatores">Fatores de risco</a>
        <a className="sidebar-link" href="#metodologia">Metodologia</a>
        <a className="sidebar-link" href="#revisao">Revisão humana</a>
      </div>
      <div className="sidebar-group sidebar-system">
        <span className="sidebar-label">Camadas</span>
        <span className="system-item">Regras determinísticas</span>
        <span className="system-item">Modelo estatístico</span>
        <span className="system-item">Contraditório independente</span>
        <span className="system-endpoint">{apiUrl()}</span>
      </div>
    </aside>
  );
}

export function RiskBar({ score, band }: { score: number; band: RiskBand }) {
  return (
    <div className="risk-bar" aria-label={`${toPercent(score)}%`}>
      <span
        className={`risk-bar-fill risk-${band.toLowerCase()}`}
        style={{ width: `${toPercent(score)}%` }}
      />
    </div>
  );
}

export function RiskOverview({
  assessment,
  climateScore,
}: {
  assessment: SACAssessment;
  climateScore: number;
}) {
  return (
    <section className="risk-overview panel" aria-label="Resumo do risco SAC">
      <div className="risk-score-block">
        <span className="panel-label">Risco SAC</span>
        <div className="primary-score">
          <strong>{toPercent(assessment.overall_score)}</strong>
          <span className={`risk-text risk-${assessment.overall_band.toLowerCase()}`}>
            {bandLabel[assessment.overall_band]}
          </span>
        </div>
        <RiskBar score={assessment.overall_score} band={assessment.overall_band} />
      </div>

      <div className="decision-block">
        <span className="panel-label">Decisão</span>
        <strong>
          {assessment.human_review_required
            ? "Revisão humana necessária"
            : "Sem revisão obrigatória"}
        </strong>
        <p>
          {assessment.human_review_required
            ? "Sinais materiais ou incerteza relevante impedem o encerramento automático da análise."
            : "Nenhum gatilho obrigatório de revisão foi acionado nesta execução experimental."}
        </p>
        <a className="button button-review" href="#revisao">
          {assessment.human_review_required ? "Entender por quê" : "Ver decisão"}
        </a>
      </div>

      <div className="dimension-summary">
        <div><span>Ambiental</span><strong>{toPercent(assessment.environmental_risk.score)}</strong></div>
        <div><span>Social</span><strong>{toPercent(assessment.social_risk.score)}</strong></div>
        <div><span>Climático</span><strong>{toPercent(climateScore)}</strong></div>
        <div><span>Risco inerente</span><strong>{toPercent(assessment.inherent_risk.score)}</strong></div>
        <div><span>Risco observado</span><strong>{toPercent(assessment.observed_risk.score)}</strong></div>
      </div>
    </section>
  );
}

export function EvidenceStateStrip({
  coverage,
  observedSignalCount,
}: {
  coverage: number;
  observedSignalCount: number;
}) {
  const gap = Math.max(0, 100 - coverage);
  return (
    <section className="knowledge-grid" aria-label="Estado das informações">
      <article className="knowledge-card knowledge-known">
        <span>O que conseguimos sustentar</span>
        <strong>{coverage}%</strong>
        <p>da evidência esperada está disponível nesta execução.</p>
      </article>
      <article className="knowledge-card knowledge-observed">
        <span>O que observamos</span>
        <strong>{observedSignalCount}</strong>
        <p>sinais simulados estão acima do limiar de atenção da demonstração.</p>
      </article>
      <article className="knowledge-card knowledge-unknown">
        <span>O que ainda não sabemos</span>
        <strong>{gap}%</strong>
        <p>de lacuna informacional. Falta de dado reduz confiança, não o risco.</p>
      </article>
    </section>
  );
}

export function EvidenceTable({ rows }: { rows: EvidenceRow[] }) {
  return (
    <section className="section-block" id="evidencias">
      <div className="section-heading">
        <div>
          <h2>Evidências</h2>
          <p>O que sustenta a análise, o que é apenas contexto e onde ainda existe incerteza.</p>
        </div>
        <span className="section-note">
          Sinais sintéticos até a integração de dados públicos chegar ao frontend
        </span>
      </div>
      <div className="evidence-legend" aria-label="Legenda de evidências">
        <span className="legend-item legend-context">Contexto</span>
        <span className="legend-item legend-observed">Observado</span>
        <span className="legend-item legend-unknown">Desconhecido</span>
      </div>
      <div className="table-panel panel">
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fonte</th>
                <th>Sinal</th>
                <th>Valor</th>
                <th>Qualidade</th>
                <th>Estado da evidência</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.source}-${row.signal}`}>
                  <td>{row.source}</td>
                  <td>{row.signal}</td>
                  <td>{row.value}</td>
                  <td>{row.confidence}</td>
                  <td><span className={`table-status evidence-${row.tone}`}>{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
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
        <span>{drivers.slice(0, 2).map(translateDriver).join(" · ") || "Sem fator material nesta execução."}</span>
      </div>
      <div className="risk-factor-score">
        <span>{toPercent(score)}</span>
        <small className={`risk-text risk-${band.toLowerCase()}`}>{bandLabel[band]}</small>
      </div>
      <RiskBar score={score} band={band} />
    </div>
  );
}

export function RiskFactors({ dimensions }: { dimensions: DimensionRow[] }) {
  return (
    <section className="section-block" id="fatores">
      <div className="section-heading">
        <div>
          <h2>Fatores de risco</h2>
          <p>As dimensões materiais permanecem separadas para evitar um score opaco.</p>
        </div>
        <span className="section-note">Escala heurística 0–100</span>
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
  );
}

function MethodMetric({ label, value }: { label: string; value: string }) {
  return <div className="method-metric"><span>{label}</span><strong>{value}</strong></div>;
}

export function Methodology({
  mlEvaluation,
  mlPrediction,
  aiReview,
  aiLoading,
  aiError,
  onRunReview,
}: {
  mlEvaluation: MLBaselineEvaluation | null;
  mlPrediction: MLBaselinePrediction | null;
  aiReview: AIAssessmentResponse | null;
  aiLoading: boolean;
  aiError: string | null;
  onRunReview: () => void;
}) {
  return (
    <section className="section-block" id="metodologia">
      <div className="section-heading">
        <div>
          <h2>Metodologia</h2>
          <p>A complexidade técnica fica disponível para auditoria, sem competir com a decisão principal.</p>
        </div>
      </div>
      <details className="methodology-disclosure">
        <summary>Ver como o ATLAS chegou a este resultado</summary>
        <div className="methodology-grid methodology-body">
          <article className="panel method-panel">
            <div className="method-steps">
              <div><span>01</span><strong>Regras</strong><p>Score determinístico e gatilhos de revisão.</p></div>
              <div><span>02</span><strong>Baseline estatístico</strong><p>Sinal secundário treinado apenas em dados sintéticos.</p></div>
              <div><span>03</span><strong>Contraditório</strong><p>Um modelo interpreta; outro desafia afirmações sem suporte.</p></div>
              <div><span>04</span><strong>Gate humano</strong><p>Camadas automatizadas não removem uma revisão determinística.</p></div>
            </div>
            <div className="model-metrics">
              <MethodMetric label="ROC-AUC" value={mlEvaluation ? mlEvaluation.roc_auc.toFixed(3) : "—"} />
              <MethodMetric label="Precisão" value={mlEvaluation ? mlEvaluation.precision.toFixed(3) : "—"} />
              <MethodMetric label="Recall" value={mlEvaluation ? mlEvaluation.recall.toFixed(3) : "—"} />
              <MethodMetric label="Brier score" value={mlEvaluation ? mlEvaluation.brier_score.toFixed(3) : "—"} />
            </div>
            <div className="method-footnote">
              <span>{mlPrediction?.model_version ?? "synthetic-logreg-v1"}</span>
              <span>{mlPrediction?.dataset_version ?? "atlas-sac-synthetic-v1"}</span>
              <span>Completude de evidência excluída das features de risco</span>
              {mlPrediction ? <span>Sinal do modelo nesta execução: {toPercent(mlPrediction.predicted_material_risk_probability)}%</span> : null}
            </div>
          </article>

          <article className="panel review-method-panel">
            <div className="review-method-head">
              <div><span className="panel-label">Contraditório independente</span><h3>Interpretação com contestação</h3></div>
              <button className="button button-secondary" type="button" onClick={onRunReview} disabled={aiLoading}>
                {aiLoading ? "Revisando…" : "Executar contraditório"}
              </button>
            </div>
            {aiError ? <div className="inline-alert inline-alert-error">{aiError}</div> : null}
            {!aiReview ? (
              <div className="review-empty">
                <p>A camada de linguagem é subordinada às regras e ao modelo estatístico. Ela explica, contesta e pede mais informação, mas não reescreve scores determinísticos.</p>
              </div>
            ) : (
              <div className="review-result">
                <div className="review-row"><span>Analista</span><strong>{aiReview.analyst?.summary ?? "Indisponível"}</strong></div>
                <div className="review-row"><span>Revisor</span><strong>{aiReview.reviewer?.verdict ?? "SEM SAÍDA"}</strong><p>{aiReview.reviewer?.rationale ?? aiReview.degradation_reason}</p></div>
                <div className="review-row review-gate-row"><span>Gate de decisão</span><strong>{aiReview.decision_gate.replaceAll("_", " ")}</strong><p>{aiReview.disagreement ? "Divergência detectada. A revisão humana permanece obrigatória." : "Nenhuma divergência material detectada nesta execução."}</p></div>
                <div className="provider-traces">{aiReview.provider_runs.map((run) => <span key={`${run.provider}-${run.role}`}>{run.role} · {run.model} · {run.latency_ms}ms · {run.prompt_version}</span>)}</div>
              </div>
            )}
          </article>
        </div>
      </details>
    </section>
  );
}

export function HumanReview({ assessment }: { assessment: SACAssessment }) {
  return (
    <section className="section-block" id="revisao">
      <div className="section-heading">
        <div><h2>Revisão humana</h2><p>O motivo pelo qual a análise precisa de uma pessoa ou pode seguir sem revisão obrigatória.</p></div>
      </div>
      <div className={`review-panel panel ${assessment.human_review_required ? "review-required" : "review-clear"}`}>
        <div>
          <span className="panel-label">Estado da decisão</span>
          <h3>{assessment.human_review_required ? "Revisão humana necessária" : "Sem revisão obrigatória"}</h3>
          <p>{assessment.methodology}</p>
        </div>
        <div className="review-reasons">
          <span className="panel-label">Gatilhos</span>
          <ul>
            {assessment.review_reasons.length
              ? assessment.review_reasons.map((reason) => <li key={reason}>{translateReviewReason(reason)}</li>)
              : <li>Nenhum gatilho obrigatório nesta execução.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
}
