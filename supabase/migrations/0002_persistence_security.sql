-- ATLAS SAC persistence hardening.
-- Public/anonymous clients must not read or mutate risk-assessment data directly.

alter table counterparties enable row level security;
alter table evidence_items enable row level security;
alter table assessment_runs enable row level security;
alter table human_reviews enable row level security;
alter table ai_runs enable row level security;

revoke all on counterparties from anon, authenticated;
revoke all on evidence_items from anon, authenticated;
revoke all on assessment_runs from anon, authenticated;
revoke all on human_reviews from anon, authenticated;
revoke all on ai_runs from anon, authenticated;

create or replace function persist_assessment_snapshot(
  p_external_ref text,
  p_company_name text,
  p_sector text,
  p_region text,
  p_is_synthetic boolean,
  p_evidence jsonb,
  p_methodology_version text,
  p_input_snapshot jsonb,
  p_result_snapshot jsonb,
  p_overall_score numeric,
  p_overall_band text,
  p_confidence numeric,
  p_human_review_required boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_counterparty_id uuid;
  v_run_id uuid;
  v_item jsonb;
begin
  if p_overall_score < 0 or p_overall_score > 1 then
    raise exception 'overall_score must be between 0 and 1';
  end if;

  if p_confidence < 0 or p_confidence > 1 then
    raise exception 'confidence must be between 0 and 1';
  end if;

  if p_overall_band not in ('LOW', 'MEDIUM', 'HIGH') then
    raise exception 'invalid overall_band';
  end if;

  if jsonb_typeof(coalesce(p_evidence, '[]'::jsonb)) <> 'array' then
    raise exception 'evidence must be a JSON array';
  end if;

  insert into counterparties (
    external_ref,
    company_name,
    sector,
    region,
    is_synthetic,
    updated_at
  ) values (
    p_external_ref,
    p_company_name,
    p_sector,
    p_region,
    p_is_synthetic,
    now()
  )
  on conflict (external_ref) do update set
    company_name = excluded.company_name,
    sector = excluded.sector,
    region = excluded.region,
    is_synthetic = excluded.is_synthetic,
    updated_at = now()
  returning id into v_counterparty_id;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_evidence, '[]'::jsonb))
  loop
    insert into evidence_items (
      counterparty_id,
      evidence_type,
      source_name,
      source_url,
      observed_at,
      payload,
      is_synthetic
    ) values (
      v_counterparty_id,
      coalesce(nullif(v_item->>'evidence_type', ''), 'unspecified'),
      coalesce(nullif(v_item->>'source_name', ''), 'unspecified'),
      nullif(v_item->>'source_url', ''),
      case
        when nullif(v_item->>'observed_at', '') is not null
          then (v_item->>'observed_at')::timestamptz
        else null
      end,
      coalesce(v_item->'payload', '{}'::jsonb),
      coalesce((v_item->>'is_synthetic')::boolean, true)
    );
  end loop;

  insert into assessment_runs (
    counterparty_id,
    methodology_version,
    input_snapshot,
    result_snapshot,
    overall_score,
    overall_band,
    confidence,
    human_review_required
  ) values (
    v_counterparty_id,
    p_methodology_version,
    p_input_snapshot,
    p_result_snapshot,
    p_overall_score,
    p_overall_band,
    p_confidence,
    p_human_review_required
  )
  returning id into v_run_id;

  return v_run_id;
end;
$$;

revoke all on function persist_assessment_snapshot(
  text, text, text, text, boolean, jsonb, text, jsonb, jsonb,
  numeric, text, numeric, boolean
) from public, anon, authenticated;

grant execute on function persist_assessment_snapshot(
  text, text, text, text, boolean, jsonb, text, jsonb, jsonb,
  numeric, text, numeric, boolean
) to service_role;

create or replace function record_human_review(
  p_assessment_run_id uuid,
  p_reviewer_ref text,
  p_decision text,
  p_rationale text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_review_id uuid;
begin
  if p_decision not in ('CONFIRM', 'OVERRIDE', 'REQUEST_MORE_INFO') then
    raise exception 'invalid review decision';
  end if;

  if length(trim(p_reviewer_ref)) < 2 then
    raise exception 'reviewer_ref is required';
  end if;

  if length(trim(p_rationale)) < 5 then
    raise exception 'review rationale is required';
  end if;

  insert into human_reviews (
    assessment_run_id,
    reviewer_ref,
    decision,
    rationale
  ) values (
    p_assessment_run_id,
    p_reviewer_ref,
    p_decision,
    p_rationale
  )
  returning id into v_review_id;

  return v_review_id;
end;
$$;

revoke all on function record_human_review(uuid, text, text, text)
  from public, anon, authenticated;
grant execute on function record_human_review(uuid, text, text, text)
  to service_role;

comment on function persist_assessment_snapshot is
  'Server-only atomic persistence for a counterparty, evidence set and immutable ATLAS SAC assessment snapshot.';
comment on function record_human_review is
  'Server-only persistence for human review decisions kept separate from model output.';
