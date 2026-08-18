create extension if not exists pgcrypto;

create table if not exists counterparties (
  id uuid primary key default gen_random_uuid(),
  external_ref text unique,
  company_name text not null,
  sector text not null,
  region text not null,
  is_synthetic boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists evidence_items (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references counterparties(id) on delete cascade,
  evidence_type text not null,
  source_name text not null,
  source_url text,
  observed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  is_synthetic boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists assessment_runs (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references counterparties(id) on delete cascade,
  methodology_version text not null,
  input_snapshot jsonb not null,
  result_snapshot jsonb not null,
  overall_score numeric(6,5) not null check (overall_score between 0 and 1),
  overall_band text not null check (overall_band in ('LOW', 'MEDIUM', 'HIGH')),
  confidence numeric(6,5) not null check (confidence between 0 and 1),
  human_review_required boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists human_reviews (
  id uuid primary key default gen_random_uuid(),
  assessment_run_id uuid not null references assessment_runs(id) on delete cascade,
  reviewer_ref text not null,
  decision text not null check (decision in ('CONFIRM', 'OVERRIDE', 'REQUEST_MORE_INFO')),
  rationale text not null,
  created_at timestamptz not null default now()
);

create table if not exists ai_runs (
  id uuid primary key default gen_random_uuid(),
  assessment_run_id uuid references assessment_runs(id) on delete cascade,
  provider text not null,
  model text not null,
  role text not null check (role in ('ANALYST', 'REVIEWER', 'EVALUATOR')),
  prompt_version text not null,
  input_hash text not null,
  structured_output jsonb,
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_evidence_counterparty on evidence_items(counterparty_id);
create index if not exists idx_assessments_counterparty_created on assessment_runs(counterparty_id, created_at desc);
create index if not exists idx_ai_runs_assessment on ai_runs(assessment_run_id);

comment on table counterparties is 'Demo/research counterparties. V1 uses synthetic data by default.';
comment on table assessment_runs is 'Immutable assessment snapshots for traceability and replay.';
comment on table ai_runs is 'LLM execution metadata. Secrets and raw sensitive prompts must never be stored here.';
