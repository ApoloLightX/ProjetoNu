# ATLAS Agent Guide

This repository is an evidence-first risk-intelligence portfolio project. Before changing code, preserve the product boundaries below.

## Non-negotiable invariants

1. **Evidence before narrative.** A generated explanation must not become the source of truth for an assessment.
2. **Missing information is uncertainty, not evidence.** Absence of data may reduce confidence/readiness or require review; it must not become favorable or adverse evidence by default.
3. **Context is not misconduct.** Registry identity, CNAE, sector, geography and inherent exposure do not prove company-specific behavior.
4. **Inherent exposure and observed evidence remain separate.** Do not collapse them into one signal without an explicit, reviewed methodology change.
5. **LLMs do not own decision authority.** Gemini/Groq may analyze and challenge. They cannot rewrite deterministic scores or remove mandatory human review.
6. **Real registry data does not legitimize synthetic findings.** A real CNPJ can provide context while the public SAC assessment inputs remain explicitly synthetic.
7. **ATLAS Micro does not make a credit decision.** Preserve `credit_decision_produced = false`. Do not add approval, denial, pricing, limit or borrower ranking without a new, explicitly reviewed product scope.
8. **Do not hide failure.** Provider/database failures should degrade or fail explicitly. Never fabricate a successful AI/database path.
9. **No secrets in repository, logs or browser bundles.** Provider keys and Supabase service-role credentials stay server-side.
10. **Human review does not rewrite history.** Automated assessments and reviewer decisions remain separately traceable.

## Scope gate for this portfolio release

A feature enters this release only if it materially improves at least one of:

- evidence;
- uncertainty;
- governance;
- engineering reliability/observability/security.

If it improves none of them, put it in a later backlog rather than adding product surface.

## Complexity gate

Do not add queues, Redis, Kubernetes, sharding, distributed locks, custom service discovery, multi-region active-active architecture or similar infrastructure without a measured problem and a documented revisit trigger.

Prefer the smallest design that is secure, observable, recoverable and testable.

## Testing expectations

When changing a product boundary, add or update a behavioral test. Important examples include:

- missing Micro evidence remains unknown rather than adverse;
- public registry context keeps `risk_signal = false`;
- invalid AI evidence references fail governed validation;
- AI/provider failure does not erase deterministic results or mandatory review;
- persistence/replay preserves immutable assessment history;
- public health/readiness checks report dependency failure instead of false health.

## Documentation discipline

Do not claim a control is active until it is implemented and verified. Distinguish clearly between:

- current implementation;
- synthetic demonstration;
- planned architecture;
- real-world validation that has not happened yet.

For architecture, model-governance and trade-off context, read:

- `docs/ARCHITECTURE.md`
- `docs/decisions.md`
- `docs/ai-safety-model-governance.md`
- `docs/production-readiness.md`
- `docs/atlas-micro.md`
