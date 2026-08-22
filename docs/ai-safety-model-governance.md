# ATLAS — AI Safety & Model Governance

ATLAS uses AI as an **assistive and adversarial layer**, not as the owner of a high-impact decision.

This document describes the current controls, limitations and failure modes. It is a research/portfolio governance model, not a claim of regulatory certification.

## 1. Authority model

```text
Evidence / explicit inputs
        ↓
Deterministic rules
        ↓
Synthetic statistical baseline
        ↓
Structured Gemini analyst
        ↓
Independent Groq reviewer
        ↓
Human-review gate
```

The deterministic layer owns SAC scores and mandatory review rules.

LLMs may explain, summarize and challenge. They may **not**:

- rewrite deterministic scores;
- remove a deterministic human-review requirement;
- convert missing evidence into a favorable or adverse fact;
- convert inherent sector/geographic exposure into company-specific misconduct;
- create a real credit decision;
- cite evidence references outside the allowlist and still be treated as valid.

## 2. Model roles

### Gemini analyst

Receives a bounded structured packet containing:

- deterministic assessment;
- synthetic ML baseline output;
- enumerated evidence/context items.

It returns structured findings, uncertainty flags and an assistive recommended action.

### Groq reviewer

Receives the same bounded decision context and challenges the analyst for:

- unsupported claims;
- causal overreach;
- contradictions;
- inherent-vs-observed confusion;
- treating missing evidence as evidence;
- misuse of the synthetic ML signal;
- references to unknown evidence IDs.

The reviewer does not become a second decision-maker. It is a challenge mechanism.

## 3. Evidence grounding

Material AI findings must cite references from an allowed set such as:

```text
E1, E2, ...                    enumerated evidence
DET:environmental_risk         deterministic result
DET:observed_risk
ML:synthetic_baseline          statistical baseline
```

An unknown reference invalidates the governed AI path instead of being accepted as a plausible citation.

This is a deliberately simpler control than a fully persisted evidence graph, but it makes grounding testable.

## 4. Prompt-injection boundary

Untrusted evidence is treated as **data**, not as instructions that may redefine the model's role.

The AI layer receives structured evidence under system-defined behavior and cannot use evidence text to:

- change the decision authority;
- bypass required evidence references;
- alter deterministic scores;
- disable human review;
- redefine synthetic inputs as real observations.

Prompt-injection resistance is not considered solved merely because an instruction says "ignore malicious prompts". It is supported by schema boundaries, reference allowlists and deterministic authority outside the LLM.

## 5. Disagreement and human oversight

Model disagreement is informative, not a vote.

```text
Analyst conclusion
       +
Reviewer challenge
       ↓
agreement / challenge / insufficient evidence
       ↓
review requirement may increase
```

A disagreement can force or reinforce human review. Agreement cannot erase an already-required deterministic review.

Human review exists for ambiguity, materiality, evidence attribution and context that automation should not resolve alone.

The reviewer outcome is stored separately from the original automated assessment when persistence is requested.

## 6. Safe degradation

AI providers are optional dependencies.

If the governed AI path fails because of:

- provider unavailability;
- timeout;
- invalid structured response;
- unsupported evidence references;
- grounding failure;

ATLAS can return a degraded deterministic result rather than inventing missing AI analysis.

The desired property is:

> **Loss of an AI feature reduces capability, not truthfulness.**

## 7. Statistical model boundary

The Logistic Regression baseline is trained on a reproducible **synthetic dataset**.

Its output is useful for demonstrating:

- feature design;
- holdout evaluation;
- probability output;
- calibration-oriented metrics;
- exclusion of `evidence_completeness` from risk features;
- interaction with a governed AI layer.

It does **not** establish real-world credit or SAC predictive performance.

The public interface and documentation must never represent synthetic evaluation metrics as validated production performance.

## 8. ATLAS Micro boundary

ATLAS Micro V8 does not use an AI model to score borrowers.

The module performs deterministic evidence-readiness analysis over synthetic observations and exposes:

```text
credit_decision_produced = false
```

Before any future predictive credit-readiness model is considered, ATLAS would require at minimum:

- lawful and representative outcome data;
- clear target definition;
- protected-attribute/fairness analysis appropriate to the use case;
- leakage checks;
- temporal validation;
- calibration analysis;
- threshold/governance policy;
- adverse-impact review;
- monitoring/drift plan;
- human escalation and appeal design;
- model documentation and change control.

## 9. Key model risks

| Risk | Current control | Residual limitation |
|---|---|---|
| Hallucinated finding | evidence-reference allowlist + structured schema | allowed evidence can still be misinterpreted |
| Unsupported causality | independent reviewer challenge | two models may share the same reasoning flaw |
| Inherent exposure treated as misconduct | deterministic separation + reviewer checks | future evidence connectors need careful classification |
| Missing data treated as adverse | confidence/readiness semantics + tests | future predictive models could reintroduce proxy behavior if poorly designed |
| Synthetic ML overstated as real | explicit synthetic labels/disclaimer | readers may still misread metrics without context |
| Provider outage | timeout + safe degradation | reduced interpretive capability during outage |
| Provider/model change | provider/model/prompt metadata in traces | external model behavior can drift even under same name |
| Prompt injection | data/instruction separation + schemas + authority outside LLM | no LLM prompt boundary is perfect |
| Automation bias | human-review gate + explicit limitations | a reviewer may still over-trust polished model prose |

## 10. Evaluation strategy

Current evaluation is mostly **behavioral regression testing**, because the project does not have a validated real-world benchmark dataset.

Tests should preserve invariants such as:

- unknown evidence references invalidate the AI path;
- public registry evidence cannot become an adverse finding by default;
- missing evidence does not lower risk or become a negative Micro signal;
- AI failure returns degraded state instead of silently pretending success;
- LLM output cannot lower deterministic human-review requirements;
- synthetic model outputs remain labeled synthetic.

Future evaluation should add a curated challenge set covering:

- unsupported causal claims;
- contradictory evidence;
- prompt-injection attempts;
- company-name/source ambiguity;
- missing evidence;
- high inherent / low observed cases;
- low inherent / high observed cases;
- provider regression after model/prompt changes.

## 11. Monitoring and change governance

Current traces record provider/model/role/prompt version/input hash/latency when the AI path runs.

A production-grade evolution would add:

- versioned eval suites as a release gate;
- structured failure-rate metrics;
- disagreement-rate monitoring;
- grounded-claim pass rate;
- provider/model drift review;
- rollback criteria;
- documented owners for model/prompt changes;
- periodic human sample review.

ATLAS intentionally does not invent SLOs, fairness numbers or drift thresholds before enough real usage/data exists to make them meaningful.

## 12. Governance principle

The purpose of the AI layer is not to make the system sound more intelligent.

It is to make uncertainty, evidence and disagreement **more inspectable without transferring final accountability to a language model**.
