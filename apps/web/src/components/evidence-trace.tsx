import type { EvidenceTrace } from "@/lib/evidence-trace";

const kindLabel: Record<EvidenceTrace["nodes"][number]["kind"], string> = {
  conclusion: "Conclusão",
  signal: "Sinal",
  context: "Contexto",
  source: "Fonte",
  unknown: "Lacuna",
  boundary: "Regra de fronteira",
};

export function EvidenceTraceExplorer({ traces }: { traces: EvidenceTrace[] }) {
  return (
    <section className="section-block" id="trilha">
      <div className="section-heading">
        <div>
          <h2>Trilha de evidência</h2>
          <p>
            Abra a análise como uma cadeia auditável: conclusão, sinais, contexto, fonte e fronteiras
            metodológicas permanecem separados.
          </p>
        </div>
        <span className="section-note">Evidence trace v1 · explicação, não um novo score</span>
      </div>

      <div className="trace-grid">
        {traces.map((trace) => (
          <article className="trace-card" key={trace.id}>
            <header className="trace-card-head">
              <span className="trace-id">{trace.id}</span>
              <h3>{trace.title}</h3>
              <p>{trace.summary}</p>
            </header>

            <ol className="trace-chain">
              {trace.nodes.map((node) => (
                <li className={`trace-node trace-${node.kind}`} key={node.id}>
                  <div className="trace-node-meta">
                    <span>{kindLabel[node.kind]}</span>
                    <code>{node.id}</code>
                  </div>
                  <strong>{node.label}</strong>
                  <p>{node.detail}</p>
                  {node.sourceUrl ? (
                    <a href={node.sourceUrl} target="_blank" rel="noreferrer">
                      Abrir fonte
                    </a>
                  ) : null}
                </li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </section>
  );
}
