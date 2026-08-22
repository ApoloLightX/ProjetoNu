"use client";

import { useMemo, useState } from "react";

import { runMicroReadiness } from "@/lib/api";
import {
  MICRO_DEMO_FALLBACKS,
  MICRO_DEMO_REQUESTS,
  type MicroDemoKey,
} from "@/lib/micro-demo";
import {
  buildEvidenceItems,
  formatBrl,
  formatPercent,
  readinessDescription,
  readinessLabel,
} from "@/lib/micro";
import type { MicroReadinessResponse } from "@/lib/types";

import styles from "./micro.module.css";

const scenarios: Array<{ key: MicroDemoKey; label: string; note: string }> = [
  { key: "complete", label: "Pacote completo", note: "6 meses + concentração + dívida" },
  { key: "gaps", label: "Com lacunas", note: "6 meses, dados complementares ausentes" },
  { key: "short", label: "Histórico curto", note: "3 meses observados" },
];

function stateLabel(state: "verified" | "partial" | "unknown") {
  if (state === "verified") return "Disponível";
  if (state === "partial") return "Parcial";
  return "Desconhecido";
}

export default function AtlasMicroPage() {
  const [scenario, setScenario] = useState<MicroDemoKey>("complete");
  const [result, setResult] = useState<MicroReadinessResponse>(MICRO_DEMO_FALLBACKS.complete);
  const [origin, setOrigin] = useState<"fixture" | "engine">("fixture");
  const [loading, setLoading] = useState(false);
  const [engineMessage, setEngineMessage] = useState<string | null>(null);

  const evidenceItems = useMemo(() => buildEvidenceItems(result), [result]);
  const metrics = result.metrics;
  const coveragePercent = Math.round(result.evidence_coverage * 100);

  function selectScenario(next: MicroDemoKey) {
    if (loading) return;
    setScenario(next);
    setResult(MICRO_DEMO_FALLBACKS[next]);
    setOrigin("fixture");
    setEngineMessage(null);
  }

  async function executeEngine() {
    setLoading(true);
    setEngineMessage(null);

    try {
      const response = await runMicroReadiness(MICRO_DEMO_REQUESTS[scenario]);
      setResult(response);
      setOrigin("engine");
      setEngineMessage("Resultado calculado pelo motor ATLAS Micro V8.");
    } catch {
      setResult(MICRO_DEMO_FALLBACKS[scenario]);
      setOrigin("fixture");
      setEngineMessage(
        "O preview visual foi preservado porque este deployment não conseguiu consultar um backend V8 compatível.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <a className={styles.brand} href="/micro" aria-label="ATLAS Micro">
          <span className={styles.brandMark} />
          <strong>ATLAS MICRO</strong>
          <span>Evidência para pequenos negócios</span>
        </a>
        <nav className={styles.topnav} aria-label="Módulos ATLAS">
          <span className={styles.syntheticPill}>Demonstração sintética</span>
          <a href="/">ATLAS SAC</a>
        </nav>
      </header>

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Evidence Passport · V8.1</span>
            <h1>Antes de julgar o negócio, entenda o que os dados conseguem provar.</h1>
            <p>
              O ATLAS Micro organiza evidências operacionais de pequenos negócios sem transformar
              ausência de informação em sinal negativo e sem produzir aprovação, negação, preço ou
              limite de crédito.
            </p>
          </div>
          <aside className={styles.principleCard}>
            <span>Princípio do produto</span>
            <strong>Informação insuficiente não é evidência negativa.</strong>
            <p>Lacunas reduzem a prontidão da análise. Elas não inventam risco.</p>
          </aside>
        </section>

        <section className={styles.scenarioBar} aria-label="Cenários sintéticos">
          <div>
            <span className={styles.sectionKicker}>Laboratório sintético</span>
            <strong>Escolha o estado das evidências</strong>
          </div>
          <div className={styles.scenarioButtons}>
            {scenarios.map((item) => (
              <button
                aria-pressed={scenario === item.key}
                className={scenario === item.key ? styles.scenarioActive : styles.scenarioButton}
                disabled={loading}
                key={item.key}
                type="button"
                onClick={() => selectScenario(item.key)}
              >
                <strong>{item.label}</strong>
                <span>{item.note}</span>
              </button>
            ))}
          </div>
          <button
            aria-busy={loading}
            className={styles.engineButton}
            type="button"
            disabled={loading}
            onClick={executeEngine}
          >
            {loading ? "Executando…" : "Executar no motor V8"}
          </button>
        </section>

        {engineMessage ? (
          <div
            aria-live="polite"
            className={origin === "engine" ? styles.engineNotice : styles.previewNotice}
            role="status"
          >
            <span>{origin === "engine" ? "Motor V8" : "Preview protegido"}</span>
            <p>{engineMessage}</p>
          </div>
        ) : null}

        <section className={styles.workspace}>
          <article className={styles.passport}>
            <header className={styles.passportHeader}>
              <div>
                <span className={styles.sectionKicker}>Micro Evidence Passport</span>
                <h2>{result.business_name}</h2>
                <p>Negócio fictício · dados exclusivamente sintéticos</p>
              </div>
              <div className={styles.originBadge}>
                <span>Origem do resultado</span>
                <strong>{origin === "engine" ? "Motor V8" : "Fixture visual"}</strong>
              </div>
            </header>

            <div className={styles.readinessGrid}>
              <div className={styles.statusBlock}>
                <span>Estado da evidência</span>
                <strong>{readinessLabel(result.status)}</strong>
                <p>{readinessDescription(result.status)}</p>
              </div>
              <div className={styles.coverageBlock}>
                <span>Cobertura de evidências</span>
                <strong>{formatPercent(result.evidence_coverage)}</strong>
                <div
                  aria-label="Cobertura de evidências"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={coveragePercent}
                  className={styles.coverageTrack}
                  role="progressbar"
                >
                  <span style={{ width: `${coveragePercent}%` }} />
                </div>
                <small>Disponibilidade do pacote, não probabilidade de inadimplência.</small>
              </div>
            </div>

            <section className={styles.evidenceSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.sectionKicker}>O que conseguimos sustentar</span>
                  <h3>Evidências disponíveis</h3>
                </div>
                <span className={styles.neutralLegend}>Estado ≠ severidade</span>
              </div>

              <div className={styles.evidenceList}>
                {evidenceItems.map((item) => (
                  <div className={styles.evidenceRow} key={item.label}>
                    <span className={`${styles.stateDot} ${styles[item.state]}`} aria-hidden="true" />
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <span className={`${styles.stateBadge} ${styles[item.state]}`}>
                      {stateLabel(item.state)}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.metricsSection}>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.sectionKicker}>O que observamos</span>
                  <h3>Descrição operacional</h3>
                </div>
                <span className={styles.neutralLegend}>Métricas descritivas</span>
              </div>

              <div className={styles.metricGrid}>
                <div className={styles.metricCard}>
                  <span>Entrada média mensal</span>
                  <strong>{formatBrl(metrics.average_monthly_inflow)}</strong>
                  <small>{metrics.periods_observed} meses observados</small>
                </div>
                <div className={styles.metricCard}>
                  <span>Fluxo líquido médio</span>
                  <strong>{formatBrl(metrics.average_net_cashflow)}</strong>
                  <small>Entradas menos saídas no pacote sintético</small>
                </div>
                <div className={styles.metricCard}>
                  <span>Meses não-negativos</span>
                  <strong>{formatPercent(metrics.positive_cashflow_month_ratio)}</strong>
                  <small>Descrição do histórico, não recomendação</small>
                </div>
                <div className={styles.metricCard}>
                  <span>Variação das entradas</span>
                  <strong>
                    {metrics.inflow_coefficient_of_variation === null
                      ? "Desconhecido"
                      : formatPercent(metrics.inflow_coefficient_of_variation, 1)}
                  </strong>
                  <small>Coeficiente de variação</small>
                </div>
                <div className={styles.metricCard}>
                  <span>Maior cliente</span>
                  <strong>
                    {metrics.largest_customer_share === null
                      ? "Desconhecido"
                      : formatPercent(metrics.largest_customer_share)}
                  </strong>
                  <small>Concentração informada no cenário</small>
                </div>
                <div className={styles.metricCard}>
                  <span>Dívida / entrada média</span>
                  <strong>
                    {metrics.debt_service_to_average_inflow === null
                      ? "Desconhecido"
                      : formatPercent(metrics.debt_service_to_average_inflow, 1)}
                  </strong>
                  <small>Comprometimento mensal informado</small>
                </div>
              </div>
            </section>
          </article>

          <aside className={styles.sideColumn}>
            <section className={styles.gapCard}>
              <span className={styles.sectionKicker}>O que ainda não sabemos</span>
              <h3>Lacunas de evidência</h3>
              {result.data_gaps.length ? (
                <ul>
                  {result.data_gaps.map((gap) => (
                    <li key={gap}>{gap}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.emptyGap}>Nenhuma lacuna prevista neste pacote sintético.</p>
              )}
              <div className={styles.gapRule}>
                <strong>Lacuna ≠ sinal adverso</strong>
                <span>O sistema registra o desconhecido em vez de preencher o silêncio com risco.</span>
              </div>
            </section>

            <section className={styles.decisionCard}>
              <span className={styles.sectionKicker}>Fronteira de decisão</span>
              <h3>Nenhuma decisão de crédito foi produzida.</h3>
              <p>
                O Evidence Passport prepara informação para revisão. Ele não decide se um negócio
                merece crédito.
              </p>
              <div className={styles.nonDecisions}>
                <span>Sem aprovação ou negação</span>
                <span>Sem limite recomendado</span>
                <span>Sem preço ou taxa</span>
                <span>Sem ranking de empresas</span>
              </div>
              <div className={styles.contractFlag}>
                <span>Contrato da API</span>
                <code>credit_decision_produced = false</code>
              </div>
            </section>

            <section className={styles.sacCard}>
              <span className={styles.sectionKicker}>ATLAS em duas lentes</span>
              <h3>Resiliência operacional não apaga contexto SAC.</h3>
              <p>
                Um pequeno negócio pode ter evidência financeira organizada e, ao mesmo tempo,
                exposição climática inerente elevada. As duas leituras permanecem separadas.
              </p>
              <a href="/">Abrir módulo ATLAS SAC →</a>
            </section>
          </aside>
        </section>

        <footer className={styles.footer}>
          <div>
            <strong>ATLAS Micro · Evidence Passport</strong>
            <span>Pesquisa de portfólio · dados sintéticos · revisão humana</span>
          </div>
          <p>{result.disclaimer}</p>
        </footer>
      </div>
    </main>
  );
}
