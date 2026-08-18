# ATLAS SAC — Architecture

## Goal

Build a traceable research platform for SAC risk assessment that separates **data**, **deterministic logic**, **statistical/ML signals**, **LLM-assisted interpretation** and **human review**.

The architecture intentionally prevents the LLM from becoming the source of truth.

## Logical flow

```text
Counterparty
    |
    v
Data intake / enrichment
    |
    +--> sector and geography features
    +--> public/synthetic evidence
    +--> uploaded evidence (future)
    |
    v
Feature layer
    |
    +--> inherent risk features
    +--> observed-risk features
    +--> evidence completeness
    |
    +------------------+
    |                  |
    v                  v
Rules engine       Statistical / ML model
    |                  |
    +---------+--------+
              |
              v
        Risk synthesis
              |
      +-------+-------+
      |               |
      v               v
Gemini analyst   Groq reviewer
      |               |
      +-------+-------+
              |
              v
       disagreement gate
              |
              v
         Human review
              |
              v
       immutable run record
```

## Boundary rules

### 1. Inherent risk

Describes exposure related to sector, geography and climate context. It **must not be represented as proof of misconduct by a company**.

### 2. Observed risk

Uses company-specific evidence/signals. Observed risk remains separate from inherent risk so a high-risk sector does not become an accusation and a low-risk sector cannot hide material observed evidence.

### 3. Confidence

Confidence reflects evidence sufficiency and data quality, not certainty that a company is "good" or "bad". Low completeness can force review even with a low numerical risk result.

### 4. LLM layer

LLMs receive structured evidence and may:

- summarize evidence;
- identify contradictions;
- propose an interpretation;
- critique another model's interpretation.

LLMs may not:

- silently invent missing evidence;
- replace deterministic risk inputs;
- make a real credit decision;
- convert sector exposure into allegations about a specific company.

### 5. Human review

V1 review gates include:

- high consolidated risk;
- high material observed risk;
- insufficient evidence;
- future model disagreement.

## Services

### `apps/web`

Next.js / TypeScript frontend. Planned after the deterministic engine is stable.

### `services/risk-engine`

FastAPI service responsible for:

- schema validation;
- feature processing;
- deterministic scoring;
- future statistical/ML inference;
- future AI orchestration;
- assessment response contracts.

### `supabase`

PostgreSQL persistence for:

- counterparties;
- evidence;
- immutable assessment snapshots;
- human reviews;
- AI-run metadata.

## Replayability

Each future persisted assessment should keep enough version metadata to answer:

- Which inputs were used?
- Which methodology version was used?
- Which model/ruleset version was used?
- Which AI provider/model/prompt version participated?
- Was a human review required?
- Did the reviewer confirm or override the recommendation?

## Security / privacy baseline

- No API keys committed to Git.
- No real confidential credit data in the public repository.
- Synthetic demo data labeled explicitly.
- AI run persistence stores metadata and structured outputs, not secrets.
- Service-role credentials stay server-side only.
- Public demo must not imply a real person's or company's risk classification.

## Non-goals for V1

- production credit underwriting;
- regulatory compliance certification;
- automated adverse credit decisions;
- legal conclusions;
- exhaustive Brazilian environmental-data integration;
- replication of any financial institution's internal process.
