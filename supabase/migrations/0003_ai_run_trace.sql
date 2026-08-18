-- Server-only persistence for versioned AI execution metadata.
-- Raw prompts and secrets are intentionally not persisted.

create or replace function record_ai_run_trace(
  p_assessment_run_id uuid,
  p_provider text,
  p_model text,
  p_role text,
  p_prompt_version text,
  p_input_hash text,
  p_structured_output jsonb,
  p_latency_ms integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ai_run_id uuid;
begin
  if p_role not in ('ANALYST', 'REVIEWER', 'EVALUATOR') then
    raise exception 'invalid ai role';
  end if;

  if length(trim(p_provider)) < 2 or length(trim(p_model)) < 2 then
    raise exception 'provider and model are required';
  end if;

  if length(trim(p_prompt_version)) < 3 then
    raise exception 'prompt_version is required';
  end if;

  if p_input_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'input_hash must be a SHA-256 hex digest';
  end if;

  if p_latency_ms is not null and p_latency_ms < 0 then
    raise exception 'latency_ms must be non-negative';
  end if;

  insert into ai_runs (
    assessment_run_id,
    provider,
    model,
    role,
    prompt_version,
    input_hash,
    structured_output,
    latency_ms
  ) values (
    p_assessment_run_id,
    p_provider,
    p_model,
    p_role,
    p_prompt_version,
    p_input_hash,
    p_structured_output,
    p_latency_ms
  )
  returning id into v_ai_run_id;

  return v_ai_run_id;
end;
$$;

revoke all on function record_ai_run_trace(
  uuid, text, text, text, text, text, jsonb, integer
) from public, anon, authenticated;

grant execute on function record_ai_run_trace(
  uuid, text, text, text, text, text, jsonb, integer
) to service_role;

comment on function record_ai_run_trace is
  'Stores provider/model/prompt-version/hash/structured-output trace metadata without raw prompts or secrets.';
