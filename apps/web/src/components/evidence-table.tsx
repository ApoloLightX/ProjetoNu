import type { EvidenceRow } from "@/components/assessment";

export function EvidenceTable({
  rows,
  hasPublicRegistryContext = false,
}: {
  rows: EvidenceRow[];
  hasPublicRegistryContext?: boolean;
}) {
  return (
    <section className="section-block" id="evidencias">
      <div className="section-heading">
        <div>
          <h2>Evidências</h2>
          <p>O que sustenta a análise, o que é apenas contexto e onde ainda existe incerteza.</p>
        </div>
        <span className="section-note">
          {hasPublicRegistryContext
            ? "Contexto cadastral público real · sinais SAC ainda sintéticos nesta etapa"
            : "Sinais sintéticos até o carregamento de contexto cadastral público"}
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
                <tr key={`${row.source}-${row.signal}-${row.value}`}>
                  <td>{row.source}</td>
                  <td>{row.signal}</td>
                  <td>{row.value}</td>
                  <td>{row.confidence}</td>
                  <td>
                    <span className={`table-status evidence-${row.tone}`}>{row.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
