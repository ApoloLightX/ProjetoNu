# ATLAS — Architecture

## Purpose

ATLAS is an evidence-first research platform with two related product lenses:

- **ATLAS SAC** organizes social, environmental and climate risk evidence for corporate counterparties.
- **ATLAS Micro** organizes small-business operational evidence into an Evidence Passport before any credit judgment is considered.

The shared architectural rule is simple:

> **Evidence and explicit uncertainty come before interpretation. Human accountability remains outside the model.**

ATLAS is an independent portfolio/research project. It does not reproduce any financial institution's internal architecture or decision process.

## System map

```text
Browser / Next.js
│
├── ATLAS SAC workstation
│   ├── CNPJ-first context
│   ├── synthetic SAC simulation
│   ├── evidence trace
│   └── human-review surface
│
└── ATLAS Micro Evidence Passport
    ├── synthetic evidence scenarios
    ├── evidence coverage
    ├── descriptive operational metrics
    └── explicit data gaps
            │
            ▼
       FastAPI risk engine
            │
    ┌───────┴───────────────────────────────┐
    │                                       │
    │ ATLAS SAC                             │ ATLAS Micro
    │                                       │
    ├─ public registry connector            ├─ synthetic-only schema boundary
    │   └─ risk_signal = false              ├─ readiness engine
    ├─ deterministic rules                  ├─ evidence coverage
    ├─ synthetic Logistic Regression        ├─ descriptive metrics
    ├─ Evidence Trace                       └─ credit_decision_produced = false
    ├─ Gemini analyst
    ├─ Groq independent reviewer
    └─ human-review gate
            │
            ▼
       Supabase / PostgreSQL
       ├─ immutable assessment snapshots
       ├─ evidence items
       ├─ AI run traces
       └─ human reviews
```

A static presentation version lives at [`assets/architecture.svg`](../assets/architecture.svg).

## ATLAS SAC data flow

```text
CNPJ / synthetic counterparty input
        ↓
public registry enrichment
        ↓
identity + CNAE + location + provenance
        │
        └── hard boundary: registry context is not adverse evidence
        ↓
deterministic SAC rules
        ↓
separate inherent / observed dimensions
        ↓
synthetic statistical baseline
        ↓
evidence trace
        ↓
Gemini structured analyst
        ↓
Groq independent challenge
        ↓
human-review gate
        ↓
optional immutable persistence / replay
```

### SAC authority boundaries

1. **Inherent exposure is not observed misconduct.** Sector, geography and climate context cannot become an accusation about a company.
2. **Registry context is not a risk signal.** The CNPJ connector preserves `risk_signal=false`.
3. **Missing evidence is uncertainty.** Evidence completeness affects confidence/review requirements, not the synthetic ML feature set.
4. **The deterministic layer owns the score.** LLM output cannot rewrite deterministic scores or remove a mandatory human-review requirement.
5. **AI claims must be grounded.** Structured findings must cite allowed deterministic, ML or evidence references.
6. **Provider failure fails safely.** AI can degrade to the deterministic path instead of inventing a substitute conclusion.

## ATLAS Micro data flow

```text
synthetic small-business evidence packet
        ↓
schema validation
        ↓
monthly operational observations
        ↓
┌────────────────────┬──────────────────────┐
│ descriptive metrics│ evidence availability│
└────────────────────┴──────────────────────┘
        ↓
explicit data gaps
        ↓
evidence-readiness state
        ↓
Evidence Passport
        ↓
future human review
```

ATLAS Micro V8 is deliberately **not a credit model**. Its API contract states:

```text
credit_decision_produced = false
```

The readiness states describe whether the evidence packet can support deeper review. They do not mean approved, denied, low risk or high risk.

## Why the two modules stay separate

Operational resilience and SAC context can both matter while describing different facts. A small business may have stable operational evidence and high inherent climate exposure at the same time.

ATLAS therefore avoids collapsing everything into one opaque number.

```text
ATLAS Micro                         ATLAS SAC
operational evidence               social / environmental / climate evidence
coverage + unknowns                inherent + observed exposure
readiness for review               risk + confidence + review gate
          │                                  │
          └──────────── evidence discipline ─┘
```

## Persistence and replay

The Supabase/PostgreSQL persistence layer keeps decision-relevant history inspectable instead of silently recomputing old results with future methodology.

Persisted assessment records include enough versioned context to answer:

- Which input snapshot was used?
- Which methodology version produced the result?
- Which AI provider/model/prompt version participated?
- Which evidence references supported the AI path?
- Was human review required?
- What did the human reviewer record separately from the original model output?

Human review is stored separately from the original assessment so a reviewer does not erase history when disagreeing with automation.

## Production-readiness layer

V7 introduced controls appropriate to the current managed/serverless architecture:

- explicit remote-call timeouts;
- bounded retry/backoff with jitter for retry-safe public-data GETs;
- `X-Request-ID` correlation;
- structured request/dependency telemetry without raw prompts or secrets;
- conservative browser/API security headers;
- evidence payload bounds;
- CI quality gates;
- database RLS/grant/index inspection;
- recovery documentation;
- dependency monitoring.

Shared/platform rate limiting remains a tracked production gap. ATLAS does not claim it exists until it is actually configured and verified.

## Deliberate non-architecture

The project intentionally does **not** use Kubernetes, sharding, distributed locks, Saga orchestration, active-active multi-region or a custom service mesh today.

Those mechanisms would add operational failure modes without solving a measured current problem. Each should be reconsidered only when traffic, reliability targets, data volume or product requirements justify it.

See [`docs/decisions.md`](decisions.md) for the decision record and revisit triggers.

## Security and privacy boundaries

- No secrets are committed to Git.
- Privileged Supabase credentials remain server-side.
- The public project does not ingest confidential borrower data.
- V8 ATLAS Micro rejects non-synthetic financial inputs at the schema boundary.
- Real CNPJ context is never combined with invented financial observations and presented as a real-company analysis.
- No bank credential collection or simulated Open Finance scraping exists.
- Public demo outputs are research/portfolio demonstrations, not financial or legal advice.
