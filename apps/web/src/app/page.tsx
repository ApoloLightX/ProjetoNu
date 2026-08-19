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

const sliderFields: Array<{ key: keyof CounterpartyRiskInput; label: string; hint: string }> = [
  { key: "sector_environmental_exposure", label: "Exposição ambiental do setor", hint: "Risco inerente associado à atividade econômica." },
  { key: "geographic_environmental_exposure", label: "Exposição ambiental geográfica", hint: "Sensibilidade ambiental associada à localização." },
  { key: "climate_physical_exposure", label: "Exposição climática física", hint: "Exposição a eventos físicos e extremos." },
  { key: "climate_transition_exposure", label: "Exposição climática de transição", hint: "Pressões regulatórias, tecnológicas ou econômicas." },
  { key: "social_signal_strength", label: "Sinais sociais observados", hint: "Intensidade de sinais específicos da contraparte." },
  { key: "environmental_event_strength", label: "Eventos ambientais observados", hint: "Força dos sinais ambientais específicos da contraparte." },
  { key: "reputational_signal_strength", label: "Sinais reputacionais", hint: "Sinais externos que exigem análise contextual." },
  { key: "evidence_completeness", label: "Completude das evidências", hint: "Quanto da informação necessária está disponível e verificável." },
];

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

function RiskBar({ score, band }: { score: number; band: RiskBand }) {
  return <div className="risk-bar" aria-label={`${toPercent(score)}%`}><span className={`risk-bar-fill risk-${band.toLowerCase()}`} style={{ width: `${toPercent(score)}%` }} /></div>;
}

function EngineStatus({ mode }: { mode: AssessmentMode }) {
  const label = mode === "live" ? "Ao vivo" : mode === "error" ? "Offline" : "Prévia";
  return <span className={`engine-status engine-${mode}`}>{label}</span>;
}

function MethodMetric({ label, value }: { label: string; value: string }) {
  return <div className="method-metric"><span>{label}</span><strong>{value}</strong></div>;
}

function RiskFactorRow({ label, score, band, drivers }: { label: string; score: number; band: RiskBand; drivers: string[] }) {
  return <div className="risk-factor-row"><div className="risk-factor-label"><strong>{label}</strong><span>{drivers.slice(0, 2).map(translateDriver).join(" · ") || "Sem fator material nesta execução."}</span></div><div className="risk-factor-score"><span>{toPercent(score)}</span><small className={`risk-text risk-${band.toLowerCase()}`}>{bandLabel[band]}</small></div><RiskBar score={score} band={band} /></div>;
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
  const climateScore = useMemo(() => (assessment.climate_physical_risk.score + assessment.climate_transition_risk.score) / 2, [assessment]);
  const observedSignalCount = useMemo(() => [input.social_signal_strength, input.environmental_event_strength, input.reputational_signal_strength].filter((value) => value >= 0.5).length, [input]);
  const evidenceGap = Math.max(0, 100 - toPercent(input.evidence_completeness));
  const evidenceRows = useMemo(() => [
    { source: "Perfil sintético", signal: "Exposição ambiental setorial", value: `${toPercent(input.sector_environmental_exposure)}%`, confidence: "Contexto", status: "CONTEXTO", tone: "context" },
    { source: "Perfil sintético", signal: "Exposição ambiental geográfica", value: `${toPercent(input.geographic_environmental_exposure)}%`, confidence: "Contexto", status: "CONTEXTO", tone: "context" },
    { source: "Sinais sintéticos", signal: "Força do evento ambiental observado", value: `${toPercent(input.environmental_event_strength)}%`, confidence: input.environmental_event_strength > 0.6 ? "Alta" : "Moderada", status: "OBSERVADO", tone: "observed" },
    { source: "Lacuna de evidência", signal: "Completude documental", value: `${toPercent(input.evidence_completeness)}%`, confidence: input.evidence_completeness >= 0.8 ? "Suficiente" : "Limitada", status: input.evidence_completeness >= 0.8 ? "COBERTURA" : "DESCONHECIDO", tone: input.evidence_completeness >= 0.8 ? "verified" : "unknown" },
  ], [input]);

  useEffect(() => {
    let active = true;
    loadMlEvaluation().then((result) => { if (active) setMlEvaluation(result); }).catch(() => { if (active) setMlEvaluation(null); });
    return () => { active = false; };
  }, []);

  function updateText(key: "company_name" | "sector" | "region", value: string) { setInput((current) => ({ ...current, [key]: value })); }
  function updateNumber(key: keyof CounterpartyRiskInput, value: string) { setInput((current) => ({ ...current, [key]: Number(value) })); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null); setAiReview(null); setAiError(null);
    try {
      const [riskResult, modelResult] = await Promise.all([runAssessment(input), runMlPrediction(input)]);
      setAssessment(riskResult); setMlPrediction(modelResult); setMode("live");
    } catch (err) {
      setMode("error"); setError(err instanceof Error ? err.message : "Não foi possível consultar o motor de risco.");
    } finally { setLoading(false); }
  }

  async function runDualModelReview() {
    setAiLoading(true); setAiError(null);
    const evidence: EvidenceInput[] = [{ evidence_type: "synthetic_demo_context", source_name: "ATLAS synthetic counterparty lab", payload: { sector: input.sector, region: input.region, note: "Synthetic user-controlled demo signals. Not an external factual source." }, is_synthetic: true }];
    try { setAiReview(await runAiAssessment(input, evidence)); }
    catch (err) { setAiReview(null); setAiError(err instanceof Error ? err.message : "O contraditório independente não pôde ser executado."); }
    finally { setAiLoading(false); }
  }

  function resetDemo() {
    setInput(DEMO_INPUT); setAssessment(DEMO_ASSESSMENT); setMlPrediction(null); setAiReview(null); setMode("preview"); setError(null); setAiError(null);
  }

  return (
    <main className="app-shell">
      <header className="topbar"><div className="topbar-brand"><strong>ATLAS</strong><span>Inteligência de Risco SAC</span></div><div className="topbar-actions"><EngineStatus mode={mode} /><span className="topbar-method">Evidência → risco → decisão humana</span></div></header>
      <aside className="sidebar" aria-label="Navegação principal"><div className="sidebar-group"><span className="sidebar-label">Análise</span><a className="sidebar-link active" href="#resumo">Resumo</a><a className="sidebar-link" href="#evidencias">Evidências</a><a className="sidebar-link" href="#fatores">Fatores de risco</a><a className="sidebar-link" href="#metodologia">Metodologia</a><a className="sidebar-link" href="#revisao">Revisão humana</a></div><div className="sidebar-group sidebar-system"><span className="sidebar-label">Camadas</span><span className="system-item">Regras determinísticas</span><span className="system-item">Modelo estatístico</span><span className="system-item">Contraditório independente</span><span className="system-endpoint">{apiUrl()}</span></div></aside>

      <div className="content">
        <section className="search-section" id="resumo"><div className="section-intro"><span>Avaliação de contraparte</span><h1>Entenda o risco antes da decisão.</h1><p>O ATLAS separa exposição, sinais observados e lacunas de evidência para tornar a análise socioambiental e climática rastreável, contestável e revisável por pessoas.</p></div><form className="counterparty-form" onSubmit={submit}><div className="search-row"><input aria-label="Empresa ou contraparte" className="company-search" value={input.company_name} onChange={(event) => updateText("company_name", event.target.value)} /><button className="button button-primary" type="submit" disabled={loading}>{loading ? "Analisando…" : "Analisar"}</button></div><div className="entity-fields"><label><span>Setor</span><input value={input.sector} onChange={(event) => updateText("sector", event.target.value)} /></label><label><span>Região</span><input value={input.region} onChange={(event) => updateText("region", event.target.value)} /></label><button className="button button-ghost" type="button" onClick={resetDemo}>Restaurar demonstração</button></div><details className="parameter-drawer"><summary>Parâmetros da demonstração</summary><div className="parameter-grid">{sliderFields.map((field) => { const value = input[field.key] as number; return <label className="parameter-field" key={field.key}><div><span>{field.label}</span><strong>{toPercent(value)}</strong></div><input aria-label={field.label} type="range" min="0" max="1" step="0.01" value={value} onChange={(event) => updateNumber(field.key, event.target.value)} /><small>{field.hint}</small></label>; })}</div></details></form>{error ? <div className="inline-alert inline-alert-error"><strong>Motor de risco indisponível.</strong><span>{error}. A prévia sintética continua visível.</span></div> : null}</section>

        <section className="entity-header"><div><h2>{assessment.company_name}</h2><p>{input.region} · {input.sector}</p></div><div className="entity-badges"><span>Perfil sintético</span><span>Metodologia experimental</span></div></section>
        <section className="knowledge-grid" aria-label="Estado das informações"><article className="knowledge-card knowledge-known"><span>O que conseguimos sustentar</span><strong>{toPercent(input.evidence_completeness)}%</strong><p>da evidência esperada está disponível nesta execução.</p></article><article className="knowledge-card knowledge-observed"><span>O que observamos</span><strong>{observedSignalCount}</strong><p>sinais simulados estão acima do limiar de atenção da demonstração.</p></article><article className="knowledge-card knowledge-unknown"><span>O que ainda não sabemos</span><strong>{evidenceGap}%</strong><p>de lacuna informacional. Falta de dado reduz confiança, não o risco.</p></article></section>

        <section className="risk-overview panel"><div className="risk-score-block"><span className="panel-label">Risco SAC</span><div className="primary-score"><strong>{toPercent(assessment.overall_score)}</strong><span className={`risk-text risk-${assessment.overall_band.toLowerCase()}`}>{bandLabel[assessment.overall_band]}</span></div><RiskBar score={assessment.overall_score} band={assessment.overall_band} /></div><div className="decision-block"><span className="panel-label">Decisão</span><strong>{assessment.human_review_required ? "Revisão humana necessária" : "Sem revisão obrigatória"}</strong><p>{assessment.human_review_required ? "Sinais materiais ou incerteza relevante impedem o encerramento automático da análise." : "Nenhum gatilho obrigatório de revisão foi acionado nesta execução experimental."}</p><a className="button button-review" href="#revisao">{assessment.human_review_required ? "Entender por quê" : "Ver decisão"}</a></div><div className="dimension-summary"><div><span>Ambiental</span><strong>{toPercent(assessment.environmental_risk.score)}</strong></div><div><span>Social</span><strong>{toPercent(assessment.social_risk.score)}</strong></div><div><span>Climático</span><strong>{toPercent(climateScore)}</strong></div><div><span>Confiança</span><strong>{toPercent(assessment.confidence)}%</strong></div><div><span>Risco observado</span><strong>{toPercent(assessment.observed_risk.score)}</strong></div><div><span>Sinal do modelo</span><strong>{mlPrediction ? `${toPercent(mlPrediction.predicted_material_risk_probability)}%` : "—"}</strong></div></div></section>

        <section className="section-block" id="evidencias"><div className="section-heading"><div><h2>Evidências</h2><p>O que sustenta a análise, o que é apenas contexto e onde ainda existe incerteza.</p></div><span className="section-note">Sinais sintéticos até a integração de dados públicos entrar nesta branch</span></div><div className="evidence-legend" aria-label="Legenda de evidências"><span className="legend-item legend-context">Contexto</span><span className="legend-item legend-observed">Observado</span><span className="legend-item legend-unknown">Desconhecido</span></div><div className="table-panel panel"><div className="data-table-wrap"><table className="data-table"><thead><tr><th>Fonte</th><th>Sinal</th><th>Valor</th><th>Confiança</th><th>Estado</th></tr></thead><tbody>{evidenceRows.map((row) => <tr key={`${row.source}-${row.signal}`}><td>{row.source}</td><td>{row.signal}</td><td>{row.value}</td><td>{row.confidence}</td><td><span className={`table-status status-${row.tone}`}>{row.status}</span></td></tr>)}</tbody></table></div></div></section>

        <section className="section-block" id="fatores"><div className="section-heading"><div><h2>Fatores de risco</h2><p>As dimensões permanecem separadas para evitar que um único número esconda a origem do risco.</p></div><span className="section-note">Escala heurística experimental de 0 a 100</span></div><div className="risk-factor-panel panel">{dimensions.map(({ key, label, dimension }) => <RiskFactorRow key={key} label={label} score={dimension.score} band={dimension.band} drivers={dimension.drivers} />)}</div></section>

        <section className="section-block" id="metodologia"><div className="section-heading"><div><h2>Metodologia</h2><p>A complexidade fica disponível para auditoria, mas não compete com a decisão principal.</p></div></div><details className="methodology-disclosure"><summary>Ver como o ATLAS chegou a este resultado</summary><div className="methodology-grid"><article className="panel method-panel"><div className="method-steps"><div><span>01</span><strong>Regras determinísticas</strong><p>Calculam o score e os gatilhos de revisão.</p></div><div><span>02</span><strong>Modelo estatístico</strong><p>Adiciona um segundo sinal treinado em dados sintéticos.</p></div><div><span>03</span><strong>Contraditório independente</strong><p>Uma análise propõe interpretação e outra procura afirmações sem suporte.</p></div><div><span>04</span><strong>Decisão humana</strong><p>Nenhuma camada de IA pode remover um bloqueio determinístico.</p></div></div><div className="model-metrics"><MethodMetric label="ROC-AUC" value={mlEvaluation ? mlEvaluation.roc_auc.toFixed(3) : "—"} /><MethodMetric label="Precisão" value={mlEvaluation ? mlEvaluation.precision.toFixed(3) : "—"} /><MethodMetric label="Recall" value={mlEvaluation ? mlEvaluation.recall.toFixed(3) : "—"} /><MethodMetric label="Brier score" value={mlEvaluation ? mlEvaluation.brier_score.toFixed(3) : "—"} /></div><div className="method-footnote"><span>{mlPrediction?.model_version ?? "synthetic-logreg-v1"}</span><span>{mlPrediction?.dataset_version ?? "atlas-sac-synthetic-v1"}</span><span>Completude de evidência excluída das features de ML</span></div></article><article className="panel review-method-panel"><div className="review-method-head"><div><span className="panel-label">Contraditório independente</span><h3>Interpretar, contestar, escalar</h3></div><button className="button button-secondary" type="button" onClick={runDualModelReview} disabled={aiLoading}>{aiLoading ? "Revisando…" : "Executar contraditório"}</button></div>{aiError ? <div className="inline-alert inline-alert-error">{aiError}</div> : null}{!aiReview ? <div className="review-empty"><p>A camada de linguagem fica depois de regras e modelo estatístico. Ela pode explicar, contestar e pedir mais informação, mas não pode reescrever os scores determinísticos.</p></div> : <div className="review-result"><div className="review-row"><span>Análise</span><strong>{aiReview.analyst?.summary ?? "Indisponível"}</strong></div><div className="review-row"><span>Revisor</span><strong>{aiReview.reviewer?.verdict ?? "SEM SAÍDA"}</strong><p>{aiReview.reviewer?.rationale ?? aiReview.degradation_reason}</p></div><div className="review-row review-gate-row"><span>Portão de decisão</span><strong>{aiReview.decision_gate.replaceAll("_", " ")}</strong><p>{aiReview.disagreement ? "Houve discordância entre modelos. A revisão humana permanece obrigatória." : "Nenhuma discordância material foi registrada nesta execução."}</p></div><div className="provider-traces">{aiReview.provider_runs.map((run) => <span key={`${run.provider}-${run.role}`}>{run.role} · {run.model} · {run.latency_ms}ms · {run.prompt_version}</span>)}</div></div>}</article></div></details></section>

        <section className="section-block" id="revisao"><div className="section-heading"><div><h2>Revisão humana</h2><p>O ATLAS mostra por que uma análise precisa de uma pessoa antes de seguir.</p></div></div><div className={`review-panel panel ${assessment.human_review_required ? "review-required" : "review-clear"}`}><div><span className="panel-label">Estado da decisão</span><h3>{assessment.human_review_required ? "Revisão humana necessária" : "Sem revisão obrigatória"}</h3><p>O resultado é experimental. Scores representam features normalizadas e não são probabilidade calibrada, score de crédito ou rating regulatório.</p></div><div className="review-reasons"><span className="panel-label">Gatilhos</span><ul>{assessment.review_reasons.length ? assessment.review_reasons.map((reason) => <li key={reason}>{translateReviewReason(reason)}</li>) : <li>Nenhum gatilho obrigatório nesta execução.</li>}</ul></div></div></section>
        <footer className="footer"><strong>ATLAS SAC</strong><span>Evidência antes da narrativa · Decisão humana por design</span></footer>
      </div>
    </main>
  );
}
