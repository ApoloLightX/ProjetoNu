# ATLAS SAC

**AI-assisted Social, Environmental & Climate Risk Intelligence**

ATLAS SAC is an independent experimental platform for identifying, classifying, explaining and monitoring **social, environmental and climate (SAC) risk** in corporate counterparties.

The project explores a simple question:

> How can public data, deterministic rules, statistical models and LLM-assisted analysis support traceable SAC risk assessment without turning a probabilistic model into an unquestioned decision-maker?

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

## V1 experience

Input: a synthetic/demo corporate counterparty with CNPJ-like identifier, economic sector, location and evidence.

Output:

- Social risk
- Environmental risk
- Climate physical risk
- Climate transition risk
- Reputational/context risk
- Inherent vs. observed risk
- Evidence completeness
- Confidence / uncertainty
- Human-review requirement
- Evidence graph / decision trace
- Risk history and drift

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
Evidence + assessments + model runs + human review
```

## Planned stack

- **Frontend:** Next.js, TypeScript
- **Risk engine:** Python, FastAPI
- **Data:** PostgreSQL / Supabase
- **ML:** scikit-learn baseline models and transparent feature engineering
- **AI:** Gemini + Groq, structured outputs, independent reviewer pattern
- **Testing:** pytest, Vitest, Playwright
- **CI:** GitHub Actions

## Regulatory and public-policy inspiration

The project is informed by public materials, not by private/internal bank information:

- Banco Central do Brasil — Resolução CMN 4.943/2021: https://www.bcb.gov.br/estabilidadefinanceira/exibenormativo?numero=4943&tipo=Resolu%C3%A7%C3%A3o+CMN
- Banco Central do Brasil — DRSAC (Documento de Risco Social, Ambiental e Climático): https://www.bcb.gov.br/estabilidadefinanceira/leiaute-documento-2030
- Nubank public governance / PRSAC page: https://international.nubank.com.br/pt-br/governanca/

These references define the **problem class and terminology**. ATLAS SAC does not claim regulatory compliance, legal adequacy, or equivalence to any institution's production system.

## Roadmap

### V0 — Foundation
- [x] Project thesis and guardrails
- [ ] Monorepo foundation
- [ ] FastAPI health/risk endpoints
- [ ] Supabase schema
- [ ] Synthetic counterparty dataset
- [ ] Deterministic risk engine v0

### V1 — Functional demo
- [ ] Counterparty onboarding
- [ ] SAC dashboard
- [ ] Inherent vs. observed risk
- [ ] Evidence completeness and uncertainty
- [ ] Evidence graph
- [ ] Human review state

### V2 — AI + ML
- [ ] Statistical/ML baseline
- [ ] Gemini risk analyst
- [ ] Groq independent reviewer
- [ ] Model disagreement gate
- [ ] Evaluation dataset

### V3 — Monitoring
- [ ] Risk timeline
- [ ] Risk drift detection
- [ ] Reassessment triggers
- [ ] Replayable assessment runs

## Disclaimer

ATLAS SAC is an educational and portfolio project. It is **not affiliated with Nubank**, is not financial or legal advice, and must not be used to make real credit or onboarding decisions without appropriate governance, validation, data rights and qualified human review.
