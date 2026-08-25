# ATLAS SAC Deployment

ATLAS SAC is a monorepo with two independently deployable applications. Keeping them separate preserves the Python/FastAPI engineering surface instead of rewriting the risk engine as a frontend API route.

## Project A — Risk Engine

Vercel project root directory:

```text
services/risk-engine
```

The Python project declares:

```toml
[tool.vercel]
entrypoint = "app.main:app"
```

Server environment variables:

```text
RISK_ENGINE_ALLOWED_ORIGINS=https://<frontend-domain>
GEMINI_API_KEY=<secret>
GEMINI_MODEL=gemini-3.6-flash
GROQ_API_KEY=<secret>
GROQ_MODEL=openai/gpt-oss-20b
SUPABASE_URL=https://<dedicated-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-only-secret>
```

`GEMINI_API_KEY`, `GROQ_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must never use a `NEXT_PUBLIC_` prefix or appear in browser code.

The Vercel function is explicitly capped at 60 seconds in `services/risk-engine/vercel.json`. Treat that as a budget, not as permission for an interactive AI request to consume the full minute. Provider latency is logged so slow paths can be measured before changing the budget or architecture.

Smoke checks after deploy:

```text
GET  /health
GET  /docs
GET  /v1/ml/evaluation
POST /v1/assessments
```

`GET /health` is dependency-aware in deployed environments. When Supabase is configured it performs a minimal PostgREST query against `assessment_runs`; a failed database probe returns HTTP 503 instead of reporting a false healthy state. Local/test environments without persistence configured remain usable and report `database=not_configured`.

AI and persistence endpoints can degrade safely when their secrets/services are not configured, but the public portfolio should only advertise them as live after explicit smoke tests.

## Portfolio availability heartbeat

The public portfolio can be reviewed days or weeks after the application is submitted. `.github/workflows/heartbeat.yml` therefore performs a small daily availability check while the portfolio is under active review:

```text
API /health -> real Supabase dependency probe
API /v1/ml/evaluation -> deterministic/ML warm path
Web / -> public SAC entry point
Web /micro -> Evidence Passport entry point
```

The workflow deliberately fails when an endpoint is unavailable. It does not use `|| true`, because a green heartbeat that hides a broken portfolio would be worse than no heartbeat at all.

The heartbeat is an availability safeguard for the portfolio period, not a substitute for production monitoring or an uptime SLA. It should be removed or revisited when the hosting plan, traffic profile or product lifecycle changes.

## Project B — Web Console

Vercel project root directory:

```text
apps/web
```

Frontend environment variable:

```text
NEXT_PUBLIC_RISK_API_URL=https://<risk-engine-domain>
```

The value is intentionally public because it is only the API base URL. No credentials belong in the frontend environment.

## CORS

After the frontend receives its final URL, update the backend environment:

```text
RISK_ENGINE_ALLOWED_ORIGINS=https://<frontend-domain>
```

For multiple preview domains, use a comma-separated allowlist rather than `*`.

## Supabase

Use a dedicated Supabase project for ATLAS SAC. Apply migrations in order:

```text
supabase/migrations/0001_init.sql
supabase/migrations/0002_persistence_security.sql
supabase/migrations/0003_ai_run_trace.sql
supabase/migrations/0004_human_review_index.sql
```

Then verify:

1. RLS is enabled on assessment tables.
2. `anon` and `authenticated` cannot directly read/write the risk tables.
3. `service_role` can call the server-only persistence RPCs.
4. A stored assessment can be replayed by immutable snapshot ID.
5. AI run traces contain structured output, provider/model, prompt version, input hash and latency, but not raw prompts or API keys.

## Deployment sequence

Recommended order:

1. Create/apply the dedicated Supabase project.
2. Deploy the FastAPI risk engine with server secrets.
3. Smoke-test `/health` and confirm `database=ok` in the deployed environment.
4. Smoke-test deterministic and ML endpoints.
5. Smoke-test Gemini/Groq with a synthetic assessment and inspect provider latency.
6. Deploy the Next.js web console with `NEXT_PUBLIC_RISK_API_URL` pointing at the backend.
7. Set the final frontend origin in backend CORS.
8. Re-run the end-to-end demo from a clean browser session and a mobile device.
9. Only then place the public demo URL in the README/CV.

## Demo integrity rule

A deployment is not considered ready merely because the homepage renders. The final demo must prove:

```text
browser
  -> deterministic FastAPI assessment
  -> synthetic ML prediction
  -> optional Gemini analyst
  -> independent Groq review
  -> human-review gate
```

Persistence/replay is a separate proof path and should also be smoke-tested once Supabase is active.