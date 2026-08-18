# ATLAS SAC

**AI-assisted Social, Environmental & Climate Risk Intelligence**

ATLAS SAC is an independent experimental platform for identifying, classifying, explaining and monitoring **social, environmental and climate (SAC) risk** in corporate counterparties.

The project explores a simple question:

> How can public data, deterministic rules, statistical models and LLM-assisted analysis support traceable SAC risk assessment without turning a probabilistic model into an unquestioned decision-maker?

## Current state

The first end-to-end engineering slice is implemented:

- Next.js + TypeScript interactive risk console
- Python + FastAPI deterministic SAC risk engine
- Explicit separation of inherent risk and observed risk
- Five SAC risk dimensions
- Evidence-completeness confidence
- Human-review gates
- Decision trace
- Responsive synthetic/demo experience
- PostgreSQL/Supabase schema for counterparties, evidence, immutable assessment snapshots and human reviews
- Server-only atomic persistence RPC, replay endpoint and separate human-review endpoint
- RLS-enabled assessment tables with no direct anonymous/authenticated access
- GitHub Actions checks for Python lint/tests and TypeScript typecheck/tests/build

The default UI loads an explicitly labeled **synthetic preview**. Clicking **Run live assessment** calls the FastAPI `POST /v1/assessments` endpoint and switches the interface to `LIVE ENGINE` when the request succeeds.

Persistence code is implemented but intentionally **fails closed** until a dedicated Supabase project is configured and the migrations are applied. The service-role key belongs only on the backend.

## Why this exists

Financial institutions need mechanisms to identify, assess, classify and monitor social, environmental and climate risk using consistent, verifiable information, including public information. Brazilian regulation also connects these risks to counterparty due diligence and credit-risk monitoring.

ATLAS SAC is built as a **portfolio and engineering research project**. It does not reproduce any institution's internal models, policies or processes, and it is not a credit-decision engine.

## Core principles

1. **Evidence before narrative** — every material conclusion must point back to data or documentary evidence.
2. **Inherent risk is not observed misconduct** — sector/geographic exposure and company-specific evidence are modeled separately.
3. **Uncertainty is explicit** — missing data reduces confidence; absence of evidence is not treated as absence of risk.
4. **LLMs assist, they do not own the decision** — model disagreement or weak evidence can force human review.
5. **Reproducibility matters** — inputs, rules, model versions and AI runs are traceable.
6. **Synthetic where necessary, real where defensible** — demo datasets are clearly labeled and never presented as real credit performance.

## Architecture

```text
Next.js / TypeScript
        |
        v
Python / FastAPI Risk Engine
        |
  +-----+--------------------+
  |     |                    |
Rules  Statistical/ML    AI Review Layer
  |     |              Gemini + Groq
  +-----+--------------------+
        |
        v
Supabase / PostgreSQL
        |
        v
Evidence + immutable assessments + model runs + human review
```

## Stack

- **Frontend:** Next.js, React, TypeScript
- **Risk engine:** Python, FastAPI, Pydantic, HTTPX
- **Data:** PostgreSQL / Supabase
- **ML V2:** scikit-learn baseline models and transparent feature engineering
- **AI V2:** Gemini + Groq, structured outputs, independent reviewer pattern
- **Testing:** pytest + Vitest
- **CI:** GitHub Actions with Ruff, pytest, TypeScript checks, Vitest and production build

## Run locally

### 1. Risk engine

```bash
cd services/risk-engine
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

API documentation: `http://localhost:8000/docs`

### 2. Web app

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

The web app defaults to `http://localhost:8000`. For another endpoint:

```bash
NEXT_PUBLIC_RISK_API_URL=https://your-risk-engine.example
```

For browser access from a deployed frontend, configure the backend with:

```bash
RISK_ENGINE_ALLOWED_ORIGINS=https://your-frontend.example
```

## Persistence and replay

Apply the migrations in `supabase/migrations` to a **dedicated** Supabase/PostgreSQL project, then configure server-only environment variables:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=server-only-secret
```

Available endpoints:

```text
POST /v1/assessments                 deterministic assessment, no persistence required
POST /v1/assessments/persist         atomic counterparty + evidence + assessment snapshot
GET  /v1/assessments/{run_id}        replay an immutable stored result
POST /v1/assessments/{run_id}/reviews persist a separate human decision
```

The persistence RPC stores input and result snapshots with a methodology version so a past decision can be inspected without silently recomputing it using future rules.

## V1 experience

The synthetic counterparty lab exposes normalized signals so reviewers can change the input and immediately see the impact on:

- Social risk
- Environmental risk
- Climate physical risk
- Climate transition risk
- Reputational/context risk
- Inherent vs. observed risk
- Evidence completeness
- Confidence / uncertainty
- Human-review requirement
- Decision trace

A central design rule is that **low evidence completeness cannot make the counterparty look safer**. It lowers confidence and can force human review.

## Regulatory and public-policy inspiration

The project is informed by public materials, not by private/internal bank information:

- Banco Central do Brasil — Resolução CMN 4.943/2021: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=4943&tipo=Resolu%C3%A7%C3%A3o+CMN
- Banco Central do Brasil — DRSAC (Documento de Risco Social, Ambiental e Climático): https://www.bcb.gov.br/estabilidadefinanceira/leiaute-documento-2030
- Nubank public governance / PRSAC page: https://international.nubank.com.br/pt-br/governanca/

These references define the **problem class and terminology**. ATLAS SAC does not claim regulatory compliance, legal adequacy, or equivalence to any institution's production system.

## Roadmap

### V0 — Foundation
- [x] Project thesis and guardrails
- [x] Repository foundation
- [x] FastAPI health/risk endpoints
- [x] Supabase schema
- [x] Deterministic risk engine v0
- [x] Automated Python quality gate

### V1 — Functional demo
- [x] Synthetic counterparty lab
- [x] SAC dashboard
- [x] Inherent vs. observed risk
- [x] Evidence completeness and uncertainty
- [x] Decision trace
- [x] Human-review state
- [x] Next.js → FastAPI integration
- [x] Web typecheck, unit tests and production build

### V1.1 — Persistence & governance
- [x] Immutable assessment snapshots
- [x] Atomic evidence + assessment persistence function
- [x] Methodology version stored per run
- [x] Replay API
- [x] Human review stored separately from model output
- [x] RLS / server-only persistence boundary
- [ ] Apply migrations to a dedicated Supabase project
- [ ] Persist/replay from the public demo UI

### V2 — AI + ML
- [ ] Versioned synthetic ML dataset
- [ ] Interpretable statistical/ML baseline
- [ ] Gemini risk analyst
- [ ] Groq independent reviewer
- [ ] Model-disagreement gate
- [ ] AI evaluation cases and safe degradation

### V3 — Monitoring & evidence
- [ ] Public-data connectors with provenance
- [ ] Evidence graph with source locators
- [ ] Risk timeline
- [ ] Risk drift detection
- [ ] Reassessment triggers

## Disclaimer

ATLAS SAC is an educational and portfolio project. It is **not affiliated with Nubank**, is not financial or legal advice, and must not be used to make real credit or onboarding decisions without appropriate governance, validation, data rights and qualified human review.
