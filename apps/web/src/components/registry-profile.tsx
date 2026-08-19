import { formatCnpj } from "@/lib/registry";
import type { CompanyRegistryProfile } from "@/lib/types";

function valueOrUnknown(value: string | number | null): string {
  if (value === null || value === "") return "Não informado";
  return String(value);
}

export function RegistryProfileCard({ profile }: { profile: CompanyRegistryProfile }) {
  const location = [profile.municipality, profile.state].filter(Boolean).join(", ") || "Não informado";
  const cnae = profile.primary_cnae_description
    ? `${profile.primary_cnae_description}${profile.primary_cnae_code ? ` · ${profile.primary_cnae_code}` : ""}`
    : valueOrUnknown(profile.primary_cnae_code);

  return (
    <section className="registry-card" aria-label="Contexto cadastral público">
      <div className="registry-card-head">
        <div>
          <span className="registry-eyebrow">Contexto cadastral público</span>
          <h2>{profile.legal_name}</h2>
          <p>{profile.trade_name ? `${profile.trade_name} · ` : ""}{formatCnpj(profile.cnpj)}</p>
        </div>
        <div className="registry-badges">
          <span className="registry-status">{valueOrUnknown(profile.registration_status)}</span>
          <span className="registry-context-badge">CONTEXTO, NÃO SINAL DE RISCO</span>
        </div>
      </div>

      <dl className="registry-grid">
        <div><dt>CNAE principal</dt><dd>{cnae}</dd></div>
        <div><dt>Localização</dt><dd>{location}</dd></div>
        <div><dt>Porte</dt><dd>{valueOrUnknown(profile.company_size)}</dd></div>
        <div><dt>Natureza jurídica</dt><dd>{valueOrUnknown(profile.legal_nature)}</dd></div>
        <div><dt>Abertura</dt><dd>{valueOrUnknown(profile.opened_at)}</dd></div>
        <div><dt>CEP</dt><dd>{valueOrUnknown(profile.postal_code)}</dd></div>
      </dl>

      <div className="registry-provenance">
        <div>
          <span>Proveniência</span>
          <strong>{profile.source_name}</strong>
        </div>
        <p>
          Este registro enriquece identidade, setor e localização. O backend marca explicitamente
          <code> risk_signal=false</code>, então o dado cadastral não pode virar um achado adverso SAC por acidente.
        </p>
        <a href={profile.source_url} target="_blank" rel="noreferrer">Abrir fonte</a>
      </div>
    </section>
  );
}
