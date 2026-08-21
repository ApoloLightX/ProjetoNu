# ATLAS Micro

## Thesis

ATLAS Micro explores a narrow product hypothesis:

> A small business with limited formal credit history should not be treated as risky merely because its evidence is incomplete.

The module is designed to organize small-business operational evidence into a traceable packet that can be reviewed by a person or institution. It is **not** designed to approve, deny, price, rank or size credit.

The core rule is:

> **Insufficient information is not adverse information.**

That extends an existing ATLAS principle: missing evidence lowers confidence and increases uncertainty; it does not silently make a counterparty safer or riskier.

## Why this belongs in ATLAS

Large companies can often present audited statements, financial teams, long banking histories, guarantees and structured documentation. Small businesses may operate continuously while leaving a much thinner formal evidence trail.

ATLAS Micro treats this as an information-structure problem before treating it as a prediction problem.

```text
operational activity
      ↓
verifiable evidence
      ↓
structured indicators
      ↓
explicit data gaps
      ↓
human review
```

## V8 foundation scope

The first slice is intentionally synthetic-only.

`POST /v1/micro/readiness` accepts a small synthetic cash-flow packet and returns:

- number of monthly periods observed;
- average inflows and outflows;
- average net cash flow;
- share of non-negative cash-flow months;
- inflow coefficient of variation;
- customer concentration when supplied;
- debt-service burden relative to average inflow when supplied;
- evidence coverage;
- explicit missing-data gaps;
- one of three evidence-readiness states.

The states are:

- `INSUFFICIENT_HISTORY`
- `NEEDS_MORE_EVIDENCE`
- `EVIDENCE_READY_FOR_REVIEW`

None of these states means approved, rejected, good borrower or bad borrower.

The response contains `credit_decision_produced=false` as a deliberate API contract.

## What V8 does not do

V8 does not:

- generate a credit score;
- recommend approval or denial;
- recommend a credit limit;
- recommend pricing or interest;
- rank real businesses;
- ingest real Open Finance credentials;
- ask users for bank passwords;
- claim access to Open Finance APIs;
- infer misconduct from CNPJ, CNAE or location;
- train a model on real borrower outcomes.

## Why the first endpoint is synthetic-only

Open Finance is not a generic public-data API. Banco Central materials state that participation is limited to institutions authorized and supervised by the BC, and that customer data sharing requires consent, authentication and confirmation within the regulated flow.

Therefore ATLAS must not simulate a production Open Finance integration by collecting banking credentials or scraping financial institutions.

A future real-data path would require a legitimate regulated participant/partner and a consent architecture designed around purpose, duration, revocation, security and auditability.

Useful official references:

- Banco Central, Open Finance participants: https://www.bcb.gov.br/estabilidadefinanceira/openfinance_participantes/
- Banco Central, customer data-sharing flow: https://www.bcb.gov.br/meubc/faqs/p/como-levar-seus-dados-de-um-banco-para-outro
- Banco Central, Open Finance customer benefits and consent flow: https://www.bcb.gov.br/estabilidadefinanceira/cliente-open-finance
- Resolução Conjunta nº 1/2020: https://normativos.bcb.gov.br/Lists/Normativos/Attachments/51028/Res_Conj_0001_v5_P.pdf

## Evidence Passport direction

A later ATLAS Micro experience can present a portable evidence packet:

```text
ATLAS MICRO PASSPORT

Business identity
  CNPJ / legal name / activity / location

Operational evidence
  cash-flow history
  customer concentration
  debt-service context
  document/source provenance

Evidence quality
  verified / supplied / unknown
  coverage
  freshness

Observed metrics
  descriptive values only

Data gaps
  explicit unknowns

Human review
  reviewer conclusion + rationale
```

The passport should distinguish three things that are frequently collapsed in weak underwriting interfaces:

1. **What is known**
2. **What is observed**
3. **What remains unknown**

## Relationship with SAC

ATLAS Micro does not replace the existing SAC engine. The long-term model is two parallel lenses:

```text
BUSINESS EVIDENCE / RESILIENCE
  operational continuity
  cash-flow evidence
  concentration
  financial obligations

SAC CONTEXT
  sector exposure
  location exposure
  environmental context
  climate physical context
  climate transition context
```

A small business can have strong operational evidence and high inherent climate exposure at the same time. Those are different facts and should remain different dimensions.

## Production-readiness gate

The Production Readiness Guardian applies to this module from the first commit.

### NOW

- synthetic-only data boundary;
- strict schema validation;
- bounded input sizes;
- no credit-decision output;
- CI tests for missing-data semantics;
- request correlation and structured logs inherited from V7.

### SOON

- separate ATLAS Micro UI;
- evidence-source provenance model;
- authenticated reviewer accounts only when a real multi-user workflow exists;
- passkeys as a candidate authentication method when accounts exist;
- audit trail for reviewer actions;
- consent model before any real financial-data ingestion.

### TRIGGERED

- background jobs for long-running enrichment;
- queues only if work exceeds interactive request budgets;
- shared cache only if repeated lookups materially dominate latency/cost;
- SLI/SLO after meaningful usage exists.

### LATER

- Kubernetes;
- sharding;
- distributed transactions;
- multi-region active-active;
- complex orchestration without measured need.

## Research questions

V8 should answer these before any predictive credit model is considered:

1. Which evidence can a small business realistically provide with low friction?
2. Which fields can be independently verified?
3. How should provenance and freshness be represented?
4. How do we distinguish thin evidence from adverse evidence?
5. What information is necessary for a human reviewer to understand uncertainty?
6. What would a legitimate Open Finance integration require operationally and regulatorily?
7. Which metrics are descriptive and which would require formal model validation before use?

Only after those questions are answered should ATLAS investigate a research model for credit readiness.
