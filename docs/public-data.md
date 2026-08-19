# Public-data enrichment

ATLAS SAC treats public-data ingestion as an evidence/provenance problem, not as permission to infer misconduct.

## First connector: CNPJ registry enrichment

Endpoint:

```text
GET /v1/registry/cnpj/{cnpj}
```

The first connector uses BrasilAPI's CNPJ endpoint, which exposes company-registry information sourced through the Minha Receita ecosystem.

The normalized response includes legal name, trade name, registration status, primary CNAE, municipality/state, company size and legal nature when available.

## Critical boundary

Registry attributes are **identity/context data**. They are not adverse-risk evidence.

ATLAS therefore returns:

```text
source_is_official = false
risk_signal = false
```

A CNAE or location can later participate in an **inherent exposure model**, but it must remain separate from observed company-specific events or findings.

## Provenance

Every normalized registry response carries the source name and exact lookup URL. Downstream evidence graphs must preserve this provenance rather than copying fields into an unattributed score.

## Reliability

The connector:

- normalizes formatted/unformatted CNPJ input;
- uses an explicit user agent for server-side calls;
- distinguishes invalid input, not-found responses and upstream failures;
- fails without modifying the deterministic SAC score;
- has mocked tests so CI does not depend on an external service being available.

## Future connectors

The next public-data adapters should prioritize sources with clear provenance and licensing. Environmental/social/climate signals must be modeled separately from company-registry enrichment and should prefer official sources when practical.
