# ATLAS — Engineering Decisions & Trade-offs

This document records **why** ATLAS is built the way it is. It is intentionally more useful than a list of technologies.

Each decision includes a revisit trigger so current simplicity does not become permanent dogma.

## D01 — Deterministic logic before generative interpretation

**Decision.** SAC scores and mandatory review rules are produced by deterministic code before an LLM is called.

**Why.** High-impact conclusions need a stable, testable authority. Generative output is useful for interpretation and challenge, not as an untraceable owner of the score.

**Trade-off.** Deterministic rules can be less flexible than a language model and require explicit maintenance.

**Revisit when.** A validated model demonstrates superior performance under formal governance while preserving explainability, testing and human escalation.

## D02 — Inherent exposure and observed evidence stay separate

**Decision.** Sector/geography/climate exposure is modeled separately from company-specific observed signals.

**Why.** A company operating in an exposed sector is not proof that it committed misconduct.

**Trade-off.** The interface and data model are more complex than a single aggregate score.

**Revisit when.** Do not collapse the concepts. Only revisit weighting/representation with validated domain evidence.

## D03 — Missing evidence changes confidence/readiness, not risk

**Decision.** Missing information creates uncertainty and may require review. It does not automatically make a company safer or riskier.

**Why.** Absence of evidence is not evidence of absence, and thin files should not become adverse evidence by default.

**Trade-off.** Some cases remain unresolved and require additional evidence or human attention.

**Revisit when.** A specific missing field itself has a validated, legally appropriate predictive meaning and the distinction is explicit in the model.

## D04 — Logistic Regression before complex ML

**Decision.** The first statistical baseline is Logistic Regression on reproducible synthetic data.

**Why.** The goal is to demonstrate the full model lifecycle, feature boundaries and evaluation discipline before optimizing predictive complexity.

**Trade-off.** It cannot claim real-world predictive performance and may underfit complex relationships.

**Revisit when.** Real, lawful, representative labeled data and a formal evaluation plan exist. Compare more complex models against the simple baseline rather than replacing it automatically.

## D05 — Independent analyst and reviewer roles

**Decision.** Gemini performs structured analysis and Groq performs an independent adversarial review.

**Why.** A second model can challenge unsupported causal claims, misuse of missing evidence, inherent-vs-observed confusion and unsupported evidence references.

**Trade-off.** Higher latency/cost and two provider dependencies. Two models can also agree on the same mistake.

**Revisit when.** Evaluation data shows another review topology is more reliable or cost-efficient. Independence should be measured, not assumed.

## D06 — Evidence references are an allowlist

**Decision.** Material AI claims must cite enumerated evidence/deterministic/ML references.

**Why.** It constrains free-form narrative and makes unsupported references detectable.

**Trade-off.** Some nuanced reasoning becomes harder to express, and the evidence schema requires maintenance.

**Revisit when.** A richer persisted Evidence Graph provides stable node/edge IDs and stronger provenance guarantees.

## D07 — CNPJ registry data is context, never adverse evidence by itself

**Decision.** Public registry enrichment carries `risk_signal=false`.

**Why.** Identity, CNAE and location help establish context. They do not prove adverse behavior.

**Trade-off.** The system refuses an easy shortcut from sector/location to company-specific findings.

**Revisit when.** The boundary should not be removed. New sources may carry separately classified observed evidence if provenance and semantics justify it.

## D08 — ATLAS Micro solves evidence readiness before credit scoring

**Decision.** V8 organizes evidence and unknowns instead of producing a borrower score.

**Why.** The product hypothesis is that small-business information can be thin or unstructured. The first problem is knowing what the available evidence can support.

**Trade-off.** The module deliberately stops short of the decision most users associate with underwriting.

**Revisit when.** Lawful real-world data, representative outcomes, fairness analysis, model validation and appropriate financial governance exist.

## D09 — Real Open Finance ingestion is deferred

**Decision.** V8 uses synthetic financial observations only and rejects non-synthetic input.

**Why.** Open Finance is a regulated consent ecosystem, not a public scraping API. ATLAS should not collect bank credentials or simulate participation it does not have.

**Trade-off.** The public demo cannot prove real financial-data integration yet.

**Revisit when.** A legitimate regulated participant/partner, consent lifecycle, security controls, auditability and data-purpose design exist.

## D10 — Managed/serverless infrastructure before Kubernetes

**Decision.** Next.js/FastAPI deploy through managed Vercel infrastructure; PostgreSQL is managed through Supabase.

**Why.** The current system does not have a measured orchestration problem worth owning a cluster for.

**Trade-off.** Platform limits and some vendor dependence.

**Revisit when.** Sustained workloads, service topology, portability needs or reliability constraints are no longer well served by the managed platform.

## D11 — Rate limiting must be shared/platform-level

**Decision.** Do not fake global rate limiting with an in-memory FastAPI counter in serverless instances.

**Why.** Multiple instances would have independent state and make the protection misleading.

**Trade-off.** Platform/shared rate limiting remains a visible open gap until configured.

**Revisit when.** Configure and verify the edge/shared limiter, or introduce an external shared store only if needed.

## D12 — Authentication and passkeys are deferred until accounts exist

**Decision.** No login is added merely to demonstrate authentication technology.

**Why.** Security features should protect a real workflow. A fake account system increases attack surface without product value.

**Trade-off.** Human-review identity is not yet an end-user product flow.

**Revisit when.** Multi-user reviewer/operator accounts become a real requirement. At that point, passkeys/WebAuthn are a strong candidate together with recovery, revocation and audit logging.

## D13 — AI failure degrades safely

**Decision.** Optional AI review can fail to a deterministic path instead of fabricating a substitute answer.

**Why.** Provider outages should reduce capability, not integrity.

**Trade-off.** Some assessments lose the analyst/reviewer layer temporarily.

**Revisit when.** Add provider fallback only if its behavior is tested and cannot bypass grounding/review rules.

## D14 — Immutable assessment snapshots, separate human review

**Decision.** Persist the original assessment snapshot and store human reviews separately.

**Why.** A later reviewer should not rewrite history. The system must be able to show what automation produced and what a person concluded afterward.

**Trade-off.** More persistence complexity and version metadata.

**Revisit when.** Extend to stable Evidence Graph/timeline IDs, not by mutating old records.

## D15 — Production-readiness features need a failure mode or metric

**Decision.** Queues, caches, circuit breakers, replicas, partitioning, canaries and similar mechanisms are introduced only for an explicit product/operational trigger.

**Why.** Infrastructure complexity creates new failure modes and maintenance cost.

**Trade-off.** ATLAS will not look like a maximalist distributed-system diagram.

**Revisit when.** Latency, throughput, cost, reliability, data volume or release risk demonstrates a concrete need.
