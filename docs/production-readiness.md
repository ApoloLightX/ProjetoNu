# Production readiness

ATLAS SAC deliberately optimizes for **correctness, traceability, security and recoverability before distributed-systems complexity**.

This document records what the project has hardened now, what remains intentionally pending, and which scale techniques are deferred until a measured trigger exists.

## Implemented in V7

### Bounded public-data retries

The CNPJ registry connector keeps its 12-second outbound timeout and now adds a deliberately small retry budget for retry-safe GET requests.

Retryable conditions:

- network/request failures;
- HTTP `408`;
- HTTP `429`;
- HTTP `500`, `502`, `503`, `504`.

Non-retryable validation and not-found responses fail immediately. Backoff is exponential, capped and jittered. This avoids both silent infinite retries and synchronized retry storms.

### Request correlation and dependency telemetry

Every API request receives an `X-Request-ID` response header. A caller-provided request ID is propagated only if it matches a conservative allowlist shape; otherwise the service generates a fresh identifier.

The request ID is bound to request-scoped telemetry so downstream dependency events can be correlated without logging evidence bodies, prompts or credentials.

The FastAPI boundary logs structured completion/failure events containing:

- request ID;
- method;
- path;
- status code when available;
- elapsed milliseconds.

The public registry logs each bounded dependency attempt with:

- dependency and operation name;
- attempt / maximum attempts;
- status code or safe error class;
- elapsed milliseconds;
- whether another retry will occur.

The AI orchestration records successful analyst/reviewer provider latency against the same request context and records a safe degraded-stage event when an AI provider cannot complete.

Secrets, provider keys, raw prompts and evidence payloads are intentionally excluded from these logs.

### HTTP security headers

The Next.js frontend emits a small low-risk security baseline:

- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

The API also emits `X-Content-Type-Options: nosniff` and exposes `X-Request-ID` through CORS.

A strict Content Security Policy is intentionally **not** added in this slice because Next.js requires a deliberate nonce/hash strategy for inline framework scripts. Shipping a cosmetic CSP that has to fall back to `unsafe-inline` would provide a misleading security signal.

### Persistence posture verification

V7 also verifies the connected Supabase persistence boundary rather than assuming the schema is secure because migrations exist.

At the point-in-time inspection on 2026-08-20:

- all five persistence tables had RLS enabled;
- there were no `anon` / `authenticated` policies for those tables;
- the persistence RPCs exposed `EXECUTE` to `service_role` only among the application roles checked;
- the expected replay/evidence/AI/human-review indexes existed;
- the persistence tables contained no live rows.

See [`database-recovery.md`](./database-recovery.md) for the reproducible schema recovery path, verified indexes and the backup/RPO/RTO boundary.

## Existing boundaries preserved

V7 does not change the SAC methodology.

- Public CNPJ registry data remains identity/context only.
- `risk_signal=false` remains a hard provenance boundary.
- Inherent exposure remains separate from observed company-specific signals.
- Synthetic SAC inputs remain explicitly synthetic.
- Missing evidence reduces confidence and may force human review; it does not make a counterparty look safer.
- Gemini/Groq output cannot rewrite deterministic scores.
- Provider failure degrades to safer deterministic behavior.
- Service-role and provider credentials remain backend-only.

## Rate limiting

Rate limiting is a **NOW** production concern for public/expensive routes, especially:

```text
GET  /v1/registry/cnpj/{cnpj}
POST /v1/ai/assess
```

It is not implemented as an in-memory FastAPI counter because ATLAS runs in a serverless/horizontally distributed environment. Per-process counters would provide inconsistent global enforcement and reset with instance lifecycle.

Preferred enforcement boundary: platform/WAF/shared rate-limit infrastructure, keyed by authenticated user/tenant in the future and by IP only as a coarse anonymous fallback.

Until that platform policy is configured, the project should not claim that application-wide rate limiting is active.

## Authentication and passkeys

ATLAS currently has no end-user account system, so authentication is intentionally not added only to make the architecture look more mature.

When authenticated reviewer/operator accounts become a real product requirement, the preferred design should consider WebAuthn/passkeys together with:

- multiple enrolled authenticators where appropriate;
- secure account recovery;
- session/device revocation;
- login and recovery throttling;
- step-up authentication for high-impact actions;
- immutable audit logging for review/override actions.

## Database and recovery

The project uses versioned migrations and immutable assessment snapshots. The live database review confirms the current known indexes match the implemented access paths, so V7 does not add speculative indexes to empty tables.

The risk engine uses Supabase through HTTPS/PostgREST instead of opening raw PostgreSQL connections from each Vercel invocation. A custom application-side PostgreSQL pool is therefore not introduced in the current architecture.

Backup retention and restore capability remain deliberately unclaimed until verified for the active Supabase plan. Schema/security recovery is reproducible from Git + migrations; runtime-record recovery depends on separately verified backup capability.

Full runbook: [`database-recovery.md`](./database-recovery.md).

## Observability roadmap

### NOW implemented

- structured request logs;
- request correlation IDs;
- public-registry attempt latency/retry telemetry;
- AI provider success/degradation telemetry without prompt logging;
- dependency timeouts;
- safe failure categories;
- CI as merge gate;
- preview deployment before production.

### SOON

- error-rate and latency dashboards over the structured events;
- persistence dependency latency if database usage becomes material;
- reviewer audit log once accounts exist;
- alerting only for failures that require action.

### TRIGGERED by meaningful traffic

- SLIs and SLOs;
- P95/P99 latency;
- error budgets;
- canary releases or feature flags for high-risk rollouts.

## Complexity intentionally deferred

ATLAS does **not** currently need:

- Kubernetes;
- custom service discovery;
- custom load balancing;
- a custom API gateway;
- sharding;
- leader election;
- distributed locks;
- Saga/distributed-transaction frameworks;
- active-active multi-region;
- chaos engineering.

These are not missing badges. Each introduces its own failure modes and operational cost. They should be adopted only when a concrete workload, reliability target, compliance constraint or measured bottleneck justifies them.

## Scale rule

```text
make it correct and observable
        ↓
measure real traffic and failures
        ↓
optimize the measured bottleneck
        ↓
only then distribute the bottleneck
```

The production-readiness goal is not to look like a million-user architecture before the first million users exist. It is to make every additional layer earn its complexity.
