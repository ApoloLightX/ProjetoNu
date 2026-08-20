# Evidence trace

ATLAS SAC treats explainability as a provenance problem, not as a request for an LLM to narrate a score.

The first evidence-trace slice makes the chain behind a result visible in the web interface:

```text
conclusion
  -> signal / contextual driver
  -> evidence state
  -> source / provenance
  -> methodological boundary
  -> human-review implication
```

## Why this exists

A single score hides important distinctions. ATLAS therefore keeps these concepts separate:

- **conclusion** — a derived risk result or evidence-coverage result;
- **context** — sector, geography, CNAE or other exposure inputs that describe the counterparty environment;
- **signal** — company-specific observed-risk input; the current public demo still labels these as synthetic;
- **source** — the provenance locator for an input when a real external source exists;
- **unknown** — explicit missing information;
- **boundary** — a rule that prevents one evidence class from being silently promoted into another.

## Current V1 traces

The frontend exposes five trace families:

1. consolidated SAC risk;
2. environmental dimension;
3. inherent exposure;
4. observed-risk signals;
5. uncertainty and evidence gaps.

The trace is explanatory only. It does **not** create a second score and does not change the deterministic engine.

## Public CNPJ boundary

When a CNPJ registry profile is loaded, the trace preserves the exact source URL and the connector contract:

```text
source_is_official = false
risk_signal = false
```

Registry identity, CNAE and location may appear in contextual or inherent-risk traces. They must not appear as adverse observed evidence solely because the company exists in the registry.

## Synthetic observed signals

The current public demo still uses synthetic user-controlled values for social, environmental-event and reputational observed-risk inputs.

For that reason the trace explicitly says when a signal is synthetic and includes a boundary node stating that CNPJ data was not converted into an adverse event.

## Missing evidence

ATLAS represents evidence gaps as first-class trace nodes.

Missing evidence is not allowed to make a counterparty look safer. It lowers confidence and can trigger human review through deterministic rules.

## Next evolution

The next evidence-graph iteration should move from frontend-derived traces to persisted graph records with stable IDs connecting:

```text
assessment conclusion
  -> normalized signal
  -> evidence item
  -> source locator
  -> transformation
  -> rule/model version
  -> AI review metadata
  -> human review
```

That persisted representation will support replay, source-level inspection, time-series monitoring and drift analysis without asking an LLM to reconstruct history after the fact.
